from jinja2 import Environment, FileSystemLoader
import glob
import json
import os
import webbrowser
import SimpleHTTPServer
import SocketServer
import srtm
import gpxpy
import math

TEMPLATE_DIR = "./template"
TRACK_META_DIR = "./tracks/meta"
TRACK_ROUTE_DIR = "./tracks/route"

OUTPUT_FILENAME = "generated_index.html"

PORT = 8000

tracks = []


def getElevationData(gpx):
    data = []
    previous_point = None
    length = 0
    for point in gpx.walk(only_points=True):
        if previous_point:
            length += previous_point.distance_2d(point)
        previous_point = point
        data.append((length, point.elevation))
    return data

print "Getting SRTM data"
elevation_data = srtm.get_data()

for track_filename in glob.glob(TRACK_META_DIR + '/*.json'):
    print "Parsing file: %s" % (track_filename)
    with open(track_filename) as data_file:
        track_data = json.load(data_file)
        track_data['gpx'] = "%s/%s" % (TRACK_ROUTE_DIR, track_data['gpx'])
        track_data['meta'] = track_data.copy()

        gpx = gpxpy.parse(open(track_data['gpx']))
        uphill_orig, downhill_orig = gpx.get_uphill_downhill()
        track_data['stats'] = {}
        track_data['stats']['uphill_orig_meters'] = math.floor(uphill_orig)
        track_data['stats']['downhill_orig_meters'] = math.floor(downhill_orig)

        track_data['stats']['length_2d_meters'] = math.floor(gpx.length_2d())
        track_data['stats']['length_3d_meters'] = math.floor(gpx.length_3d())

        track_data['elevation'] = {}
        track_data['elevation']['orig'] = getElevationData(gpx)

        elevation_data.add_elevations(gpx, smooth=True)
        uphill_srtm, downhill_srtm = gpx.get_uphill_downhill()
        track_data['stats']['uphill_srtm_meters'] = math.floor(uphill_srtm)
        track_data['stats']['downhill_srtm_meters'] = math.floor(downhill_srtm)

        track_data['elevation']['srtm'] = getElevationData(gpx)

        tracks.append(track_data)


def tojson(iterable):
    return json.dumps(iterable)

j2_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR), trim_blocks=True)
j2_env.filters['tojson'] = tojson
html_output = j2_env.get_template('index.jinja.html').render(
    tracks=tracks
)

with open(OUTPUT_FILENAME, 'w') as f:
    f.write(html_output)

SocketServer.TCPServer.allow_reuse_address = True
httpd = SocketServer.TCPServer(
    ("", PORT),
    SimpleHTTPServer.SimpleHTTPRequestHandler
)

webbrowser.open('http://localhost:%d/%s' % (PORT, OUTPUT_FILENAME))

print "Serving at port", PORT
try:
    httpd.serve_forever()
except KeyboardInterrupt:
    pass
httpd.server_close()
