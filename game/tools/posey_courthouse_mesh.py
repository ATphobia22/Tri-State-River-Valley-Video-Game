"""Reference-guided Posey County Courthouse mesh construction.

The 2020 Indiana GIO lidar building polygon fixes the horizontal footprint.
NPS nomination and licensed reference photos determine visible architecture,
NOT survey dimensions or physical materials. All Y elevations/roof pitches here
are artwork; a bare-earth 3DEP DEM cannot supply roof elevations.
"""
import math

WIDTH=21.73  # footprint side lengths derived from GIO objectid 741267
DEPTH=31.55
ARTISTIC_EAVE=14.8
ARTISTIC_RIDGE=17.4
ARTISTIC_CUPOLA_TOP=29.8

def assemble(m):
    """Add detailed triangles grouped by PBR material; return honest provenance."""
    windows=0
    # Three-storey Italianate central brick mass with projecting facade bays.
    m.box((WIDTH-2.4,13.9,DEPTH-4.4),(0,7,1.0),'red')
    for x in (-7.25,7.25):
        m.box((6.5,14.6,6.0),(x,7.3,-12.0),'red')
    # Molded stone foundation and wraparound projecting cornice bands.
    for y,thick in ((1.0,.42),(4.92,.24),(9.18,.25),(14.2,.48)):
        m.box((WIDTH+.15,thick,DEPTH+.20),(0,y,.12),'wood')
    # Major corner pilasters divide the red brick face into vertical bays.
    for x in (-WIDTH/2+0.5,WIDTH/2-0.5):
        for z in (-DEPTH/2+0.6,DEPTH/2-0.6):
            m.box((.55,13.5,.55),(x,7.2,z),'wood')
    # Front/back windows: narrow Italianate arched openings, three stacked floors.
    for side in (-1,1):
        z=side*(DEPTH/2-.12)
        normal=side*.3
        for x in (-8.0,-5.0,-2.0,2.0,5.0,8.0):
            for y in (3.4,7.8,12.1):
                if side<0 and abs(x)<2.1 and y<5.0:continue
                pane_z=z+normal
                m.box((1.43,2.24,.18),(x,y,pane_z),'glass')
                m.box((1.75,.19,.3),(x,y-1.27,pane_z),'wood')
                for dx in (-.85,.85):m.box((.15,2.54,.22),(x+dx,y,pane_z),'wood')
                # Five tapered voussoir-like trim segments across a shallow arch.
                for k in range(5):
                    t=(k+.5)/5
                    ax=x+(t-.5)*1.68
                    ay=y+1.28+.24*math.sin(math.pi*t)
                    m.box((.33,.18,.22),(ax,ay,pane_z),'wood')
                windows+=1
    # Side windows, framed even though true sash detail is not measured.
    for side in (-1,1):
        x=side*(WIDTH/2-.16)
        for z in (-10.0,-5.0,.0,5.0,10.0):
            for y in (3.4,7.8,12.1):
                m.box((.17,2.1,1.45),(x+side*.22,y,z),'glass')
                for dz in (-.84,.84):
                    m.box((.24,2.43,.13),(x+side*.34,y,z+dz),'wood')
                m.box((.28,.22,1.76),(x+side*.30,y+1.28,z),'wood')
                windows+=1
    # Low-pitched two-sided slate/copper roof, with raised central ridge.
    slope=math.atan2(ARTISTIC_RIDGE-ARTISTIC_EAVE, WIDTH/2)
    panel_length=math.hypot(WIDTH/2+1,ARTISTIC_RIDGE-ARTISTIC_EAVE)
    for side in (-1,1):
        m.box((panel_length,.35,DEPTH+.45),(side*(WIDTH/4+.1),
          (ARTISTIC_RIDGE+ARTISTIC_EAVE)/2,.0),'roof',
          rotate=(0,0,-side*slope))
    for side in (-1,1):
        x=side*7.25
        m.box((6.8,.28,6.9),(x,14.9,-12.1),'wood')
        m.box((4.45,.40,7.2),(x-1.6,16.0,-12.1),'roof',rotate=(0,0,+.49))
        m.box((4.45,.40,7.2),(x+1.6,16.0,-12.1),'roof',rotate=(0,0,-.49))
        m.box((.95,2.65,.25),(x,15.3,-15.65),'wood') # projecting gable keystone
        m.cylinder(.49,.16,(x,16.4,-15.95),'glass',sections=20,rotate=(math.pi/2,0,0))
    # Eave fascia and bracketed entablature rhythm.
    m.box((WIDTH+1.25,.42,.45),(0,ARTISTIC_EAVE-.08,-DEPTH/2-.14),'wood')
    m.box((WIDTH+1.25,.42,.45),(0,ARTISTIC_EAVE-.08,DEPTH/2+.14),'wood')
    for x in range(-10,11,2):
        for z in (-DEPTH/2-.12,DEPTH/2+.12):
            m.box((.36,.65,.54),(x,ARTISTIC_EAVE-.67,z),'wood')
    # Primary entrance portico, paired columns, stone steps and balustrade.
    m.box((7.8,.45,3.6),(0,4.65,-DEPTH/2-.88),'wood')
    m.box((7.35,.38,3.0),(0,2.2,-DEPTH/2-1.0),'wood')
    for x in (-3.3,3.3):
        m.cylinder(.37,4.05,(x,2.6,-DEPTH/2-2.2),'wood',sections=14)
        m.box((1.0,.3,1),(x,4.65,-DEPTH/2-2.2),'wood')
    for i in range(3):
        m.box((7.7+i*.6,.25,.62),(0,.22+i*.24,-DEPTH/2-3.0+i*.46),'wood')
    m.box((2.75,4.1,.25),(0,2.08,-DEPTH/2-.21),'roof')
    m.box((3.0,.20,.42),(0,4.26,-DEPTH/2-.38),'wood')
    # Octagonal octagonal white lantern + metallic domed top, ring cornices and clocks.
    m.cylinder(3.3,1.2,(0,18.0,1.15),'wood',sections=8)
    m.cylinder(2.35,4.1,(0,20.55,1.15),'metal',sections=8)
    for theta in [k*math.pi/4 for k in range(8)]:
        x=2.55*math.sin(theta);z=1.15+2.55*math.cos(theta)
        m.cylinder(.25,3.3,(x,20.65,z),'wood',sections=8)
        m.cylinder(.32,.38,(x,22.35,z),'wood',sections=8)
    m.cylinder(2.85,.56,(0,23.06,1.15),'wood',sections=8)
    m.cone(3.0,3.4,(0,24.95,1.15),'roof',sections=8)
    m.cylinder(.22,2.8,(0,27.7,1.15),'gold',sections=10)
    m.cone(.50,.85,(0,29.45,1.15),'gold',sections=12)
    for side in (-1,1):
        z=1.15+side*2.63
        m.cylinder(.72,.12,(0,21.35,z),'wood',sections=24,rotate=(math.pi/2,0,0))
        m.box((.08,.52,.1),(0,21.48,z+side*.1),'roof')
        m.box((.35,.08,.1),(.10,21.35,z+side*.1),'roof')
    return {"id":"courthouse","horizontalFootprintSourceObjectID":741267,
            "heightEvidence":"UNMEASURED_ARTISTIC_PROPORTIONS",
            "architecturalFeatures":{"archedWindows":windows,"corniceBands":4,
              "octagonalCupola":True,"projectingFrontBays":2,
              "stonePortico":True,"clockFaces":2},
            "nominalFootprintMeters":[WIDTH,DEPTH],
            "nominalMaxHeightMeters":ARTISTIC_CUPOLA_TOP,
            "license":"Project-original procedural geometry informed by NPS photos; no photographic textures"}
