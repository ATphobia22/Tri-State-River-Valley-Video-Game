// River Valley family-game terrain-preview importer. No third-party packages required.
// Add this file under Assets/RiverValley/Editor; from Unity use River Valley > Import Mount Vernon Preview Terrain.
// WARNING: source DEM vertical datum is unverified and 8.4% is inpainted.
#if UNITY_EDITOR
using System;
using System.IO;
using UnityEditor;
using UnityEngine;

public static class RiverValleyPreviewTerrainImporter
{
    [Serializable]
    private class Descriptor
    {
        public int gridResolution;
        public float widthMeters, depthMeters, heightMeters, elevationMinFt, elevationMaxFt;
    }

    [MenuItem("River Valley/Import Mount Vernon Preview Terrain")]
    public static void Import()
    {
        const string dataDir = "Assets/RiverValley/Data";
        string manifestPath = Path.Combine(dataDir, "terrain_manifest.json");
        string binaryPath = Path.Combine(dataDir, "heightmap_257.r16");
        if (!File.Exists(manifestPath) || !File.Exists(binaryPath))
        {
            Debug.LogError("River Valley data missing. Keep the ZIP's Assets/RiverValley/Data files together.");
            return;
        }
        var d = JsonUtility.FromJson<Descriptor>(File.ReadAllText(manifestPath));
        if (d == null || d.gridResolution != 257 || d.widthMeters <= 0 || d.depthMeters <= 0 || d.heightMeters <= 0)
        {
            Debug.LogError("River Valley terrain manifest failed validation.");
            return;
        }
        byte[] bytes = File.ReadAllBytes(binaryPath);
        int n=d.gridResolution;
        if(bytes.Length != n*n*2)
        {
            Debug.LogError("River Valley heightmap unexpected size: " + bytes.Length);
            return;
        }
        var h=new float[n,n];
        for(int row=0;row<n;row++)
        for(int col=0;col<n;col++)
        {
            int at=2*(row*n+col);
            ushort sample=(ushort)(bytes[at] | (bytes[at+1]<<8));
            h[row,col]=sample/65535f;
        }
        var terrainData=new TerrainData
        {
            heightmapResolution=n,
            size=new Vector3(d.widthMeters,d.heightMeters,d.depthMeters)
        };
        terrainData.SetHeights(0,0,h);
        const string generated="Assets/RiverValley/Generated";
        if(!AssetDatabase.IsValidFolder("Assets/RiverValley")) AssetDatabase.CreateFolder("Assets","RiverValley");
        if(!AssetDatabase.IsValidFolder(generated)) AssetDatabase.CreateFolder("Assets/RiverValley","Generated");
        // Generate a new asset path, so user assets are never overwritten.
        string assetPath=AssetDatabase.GenerateUniqueAssetPath(generated+"/MountVernonTerrain.asset");
        AssetDatabase.CreateAsset(terrainData,assetPath);
        var terrainObject=Terrain.CreateTerrainGameObject(terrainData);
        terrainObject.name="River Valley Mount Vernon | PREVIEW";
        terrainObject.transform.position=Vector3.zero;
        Selection.activeGameObject=terrainObject;
        AssetDatabase.SaveAssets();
        Debug.LogWarning("River Valley preview terrain created; source vertical datum remains PENDING_EVIDENCE. " + assetPath);
    }
}
#endif
