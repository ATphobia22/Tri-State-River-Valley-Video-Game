/* Deeper finger / tool IK validation for the 27-joint hero. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ValleyHandIkValidation=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const FINGERS=['Thumb','Index','Middle','Ring','Pinky'];
  const ACTIVITIES=Object.freeze({
    fish:{grip:0.68,tools:['rod'],twoHanded:true},
    hunt:{grip:0.58,tools:['rifle'],twoHanded:true},
    cook:{grip:0.55,tools:['spoon'],twoHanded:false},
    drive:{grip:0.48,tools:['wheel'],twoHanded:true},
    farm:{grip:0.44,tools:['hoe'],twoHanded:false},
    interact:{grip:0.4,tools:[],twoHanded:false},
    idle:{grip:0.11,tools:[],twoHanded:false}
  });
  function expectedJoints(){
    const joints=[];
    for(const side of ['Left','Right']){
      joints.push(side+'Hand',side+'ForeArm',side+'Arm');
      for(const f of FINGERS)joints.push(side+f);
    }
    return joints;
  }
  function validateGrip(activity,jointRotations={}){
    const spec=ACTIVITIES[activity];
    if(!spec)return {ok:false,error:'Unknown activity: '+activity};
    const issues=[];
    const gain=spec.grip;
    if(!(gain>=0&&gain<=1))issues.push('grip out of range');
    for(const side of ['Left','Right']){
      for(let i=0;i<FINGERS.length;i++){
        const name=side+FINGERS[i];
        const rot=jointRotations[name];
        if(rot==null)continue;
        const amount=gain*(i===0?0.65:i===1?0.85:1);
        if(Math.abs(rot)>1.6)issues.push(name+' hyperextension risk');
        if(activity!=='idle'&&Math.abs(rot)<amount*0.2&&spec.twoHanded)
          issues.push(name+' under-curled for '+activity);
      }
    }
    if(spec.twoHanded&&jointRotations.LeftHand!=null&&jointRotations.RightHand!=null){
      const sep=Math.abs((jointRotations.LeftHand||0)-(jointRotations.RightHand||0));
      if(activity==='drive'&&sep>1.2)issues.push('steering hands too asymmetric');
    }
    return {ok:issues.length===0,activity,grip:gain,tools:spec.tools,twoHanded:spec.twoHanded,issues};
  }
  function suite(){
    const results=[];
    for(const name of Object.keys(ACTIVITIES)){
      const pose={};
      for(const side of ['Left','Right']){
        pose[side+'Hand']=0.1;
        FINGERS.forEach((f,i)=>{pose[side+f]=ACTIVITIES[name].grip*(i===0?0.5:0.8);});
      }
      results.push(validateGrip(name,pose));
    }
    return {joints:expectedJoints(),jointCount:expectedJoints().length,activities:Object.keys(ACTIVITIES),
      results,allOk:results.every(r=>r.ok)};
  }
  return Object.freeze({ACTIVITIES,FINGERS,expectedJoints,validateGrip,suite});
});
