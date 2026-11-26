"""WGS84 local ENU -> Earth-centered Earth-fixed math for *reviewed* 3D Tiles.

This is a coordinate transform utility, not an authoritative registration.
Callers must independently establish a surveyed lon/lat/ellipsoidal height,
axis conventions, coordinate epoch and any orthometric-to-ellipsoidal conversion.
3D Tiles Cartesian positions are X-east, Y-north, Z-up. glTF Y-up to tile
Z-up conversion is a separate renderer rule; do not mirror source geometry.
"""
from __future__ import annotations
import math

WGS84_A=6378137.0
WGS84_F=1/298.257223563
WGS84_E2=WGS84_F*(2-WGS84_F)

def _number(value, minimum=None, maximum=None):
    if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value):
        raise ValueError('finite numeric coordinate required')
    value=float(value)
    if minimum is not None and value<minimum or maximum is not None and value>maximum:
        raise ValueError('coordinate outside permitted range')
    return value

def geodetic_to_ecef(lon_deg,lat_deg,height_m):
    """EPSG:4979 longitude/latitude/ellipsoid height -> EPSG:4978 metres."""
    lon=math.radians(_number(lon_deg,-180,180))
    lat=math.radians(_number(lat_deg,-90,90))
    height=_number(height_m)
    sinlat=math.sin(lat);coslat=math.cos(lat)
    N=WGS84_A/math.sqrt(1-WGS84_E2*sinlat*sinlat)
    return ((N+height)*coslat*math.cos(lon),
            (N+height)*coslat*math.sin(lon),
            (N*(1-WGS84_E2)+height)*sinlat)

def root_enu_to_ecef_transform(*,lon_deg,lat_deg,height_m):
    """16-element column-major affine root matrix for a 3D Tiles ENU frame.

    Requires externally verified WGS84 ellipsoidal origin; never substitute
    local gameplay height or NAVD88 orthometric elevation for height_m.
    """
    x,y,z=geodetic_to_ecef(lon_deg,lat_deg,height_m)
    lon,lat=math.radians(lon_deg),math.radians(lat_deg)
    sl,cl=math.sin(lon),math.cos(lon)
    sp,cp=math.sin(lat),math.cos(lat)
    east=(-sl,cl,0.)
    north=(-sp*cl,-sp*sl,cp)
    up=(cp*cl,cp*sl,sp)
    return (
       east[0],east[1],east[2],0.,
       north[0],north[1],north[2],0.,
       up[0],up[1],up[2],0.,
       x,y,z,1.)

def transform_position(matrix,local):
    if len(matrix)!=16 or len(local)!=3:
        raise ValueError('Expected 4x4 affine transform and 3D point')
    m=tuple(_number(x) for x in matrix)
    x,y,z=(_number(c) for c in local)
    if m[3]!=0 or m[7]!=0 or m[11]!=0 or m[15]!=1:
        raise ValueError('Non-affine transform')
    return (m[0]*x+m[4]*y+m[8]*z+m[12],
            m[1]*x+m[5]*y+m[9]*z+m[13],
            m[2]*x+m[6]*y+m[10]*z+m[14])
