/**
 * Official Indiana GIO orthophotography WMS context layer.
 * Source: https://di-ingov.img.arcgis.com/arcgis/services/DynamicWebMercator/Indiana_Current_Imagery/ImageServer/WMSServer
 * Published service: Indiana Current Imagery, 2022-2025, CC0. EPSG:3857.
 * This is an opt-in CesiumJS inspector source, not Babylon gameplay terrain.
 */
import {createCesiumImageryController} from './cesium-imagery-controller.mjs';

export const INDIANA_CURRENT_ORTHO = Object.freeze({
 id:'indiana-gio-current-ortho',
 kind:'wms',
 url:'https://di-ingov.img.arcgis.com/arcgis/services/DynamicWebMercator/Indiana_Current_Imagery/ImageServer/WMSServer',
 layers:'Indiana_Current_Imagery:None',
 licenseReviewed:true,
 attribution:'Indiana Geographic Information Office · Current Orthoimagery (CC0)',
 provenanceId:'indiana-gio-current-ortho-2022-2025',
 alpha:1,
 brightness:1
});

export function attachIndianaOrthoImagery({Cesium,viewer,onError}={}){
 const controller=createCesiumImageryController({
  Cesium,viewer,maxLayers:4,allowedHosts:['di-ingov.img.arcgis.com'],onError
 });
 const registered=controller.add(INDIANA_CURRENT_ORTHO);
 return Object.freeze({controller,registered});
}
