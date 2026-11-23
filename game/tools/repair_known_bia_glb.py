#!/usr/bin/env python3
"""Narrow, non-destructive repair for a known BIA\\0 instead of BIN\\0 GLB error.

Fixes ONLY the four-byte chunk tag, never geometry, rig, animation or materials.
Output destination must be new; originals are not overwritten.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys

EXPECTED=b"BIA\x00"
STANDARD=b"BIN\x00"

def repair(source:Path,target:Path):
    source,target=Path(source),Path(target)
    data=bytearray(source.read_bytes())
    if len(data)<40 or data[:4]!=b"glTF" or struct.unpack_from("<I",data,4)[0]!=2:
        raise ValueError("Not a glTF 2.0 binary source")
    if struct.unpack_from("<I",data,8)[0]!=len(data):
        raise ValueError("Source byte length mismatch")
    json_len,tag=struct.unpack_from("<II",data,12)
    if tag!=0x4e4f534a or json_len<2 or 28+json_len>len(data):
        raise ValueError("Invalid first GLB JSON chunk")
    json.loads(data[20:20+json_len])
    loc=24+json_len
    if data[loc:loc+4]!=EXPECTED:
        raise ValueError("Known BIA chunk defect not present; refusing unrelated mutation")
    bin_len=struct.unpack_from("<I",data,20+json_len)[0]
    if bin_len<1 or 28+json_len+bin_len!=len(data):
        raise ValueError("Unexpected embedded binary chunk length")
    if source.resolve()==target.resolve():
        raise ValueError("Never overwrite the source")
    old_sha=hashlib.sha256(data).hexdigest()
    data[loc:loc+4]=STANDARD
    with target.open("xb") as f: f.write(data)
    new_sha=hashlib.sha256(data).hexdigest()
    return {
      "source":source.name, "repaired":target.name, "bytes":len(data),
      "before_sha256":old_sha,"after_sha256":new_sha,
      "changed_byte_offset":loc+2,"repair":"BIA\\0 -> BIN\\0",
      "status":"GLB_HEADER_FIXED_ONLY__GAMEPLAY_NOT_VERIFIED"
    }

def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("source",type=Path)
    p.add_argument("target",type=Path)
    args=p.parse_args(argv)
    try:print(json.dumps(repair(args.source,args.target),indent=2))
    except (OSError,ValueError,IndexError,KeyError,struct.error) as exc:
        print(json.dumps({"error":str(exc)}),file=sys.stderr);return 1
    return 0

if __name__=="__main__":sys.exit(main())
