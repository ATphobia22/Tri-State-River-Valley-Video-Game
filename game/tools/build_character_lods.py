#!/usr/bin/env python3
"""Generate original standalone rigged River Explorer GLBs at three deterministic budgets."""
import os, subprocess, sys, json
from pathlib import Path

HERE=Path(__file__).resolve().parent
def run():
 results=[]
 for lod in ('LOD0','LOD1','LOD2'):
  env=os.environ.copy();env['RIVER_CHARACTER_LOD']=lod
  p=subprocess.run([sys.executable,str(HERE/'build_rigged_hero.py')],env=env,check=True,capture_output=True,text=True)
  results.append(json.loads(p.stdout))
 if {r['lod'] for r in results}!={'LOD0','LOD1','LOD2'}:raise RuntimeError('Incomplete LOD builds')
 if any(r['boneCount']!=27 or len(r['clips'])!=13 or r['usesExternalResources'] for r in results):
  raise RuntimeError('Invalid LOD animation, skin or offline policy')
 # Geometric LOD must materially reduce triangles and vertices without losing a bone/clip.
 for a,b in zip(results,results[1:]):
  if not(a['triangleCount']>b['triangleCount'] and a['vertexCount']>b['vertexCount']):
   raise RuntimeError('Character LOD is not geometrically simpler: '+str(results))
 print(json.dumps({'character_lods':results},sort_keys=True))
if __name__=='__main__':run()
