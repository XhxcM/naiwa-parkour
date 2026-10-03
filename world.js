'use strict';
// One perspective camera and one world coordinate system for every visible object.
class ForestWorld {
  constructor(canvas) {
    const T=THREE;this.T=T;
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.scene=new T.Scene();this.scene.background=new T.Color('#bddbd1');this.scene.fog=new T.Fog('#bddbd1',35,125);
    this.camera=new T.PerspectiveCamera(53,1,.1,180);
    this.camera.position.set(0,5.8,10);this.camera.lookAt(0,1,-23);
    this.scene.add(new T.HemisphereLight(0xe5f5da,0x556941,2.2));
    const sun=new T.DirectionalLight(0xffe5aa,2.8);sun.position.set(-12,25,8);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-40,near:.5,far:80});sun.shadow.bias=-.001;sun.shadow.normalBias=.035;
    sun.target.position.set(0,0,-18);this.scene.add(sun,sun.target);
    this.materials={};
    const colors={grass:0x71984c,grass2:0x638a43,dirt:0xd9b47b,edge:0xb49860,mark:0xb69565,bark:0x725239,cut:0xd8b17b,leaf:0x397444,leaf2:0x508447,leaf3:0x6f9650,rock:0x8b9690,moss:0x6a8b47,orange:0xe78a36,bag:0xad6430,skin:0xe8b783,hat:0xe3ba76,boots:0x594638,pants:0x364c49};
    for(const [name,color]of Object.entries(colors))this.materials[name]=new T.MeshStandardMaterial({color,roughness:1,flatShading:true});
    this.tiles=[];
    for(let i=0;i<14;i++){
      const group=new T.Group();this.box(group,160,.15,12,0,-.13,0,i%2?'grass':'grass2',false);
      this.box(group,7.7,.13,12,0,-.04,0,'edge',false);this.box(group,7.2,.14,12,0,-.025,0,'dirt',false);
      for(const x of [-1.2,1.2])this.box(group,.035,.006,12,x,.05,0,'mark',false);
      for(let j=0;j<18;j++){
        const x=Math.sin(i*72+j*53)*3.4,z=Math.cos(i*45+j*29)*5.7;
        this.box(group,.035+(j%3)*.02,.008,.12+(j%4)*.07,x,.051,z,j%2?'edge':'mark',false);
      }
      group.userData.offset=i*12;this.scene.add(group);this.tiles.push(group);
    }
    this.scenery=[];
    for(let i=0;i<120;i++){
      const side=i%2?-1:1;const row=Math.floor(i/2);
      const x=side*(5.4+(row%3)*3.8+this.hash(i)*2);
      const tree=this.tree(.7+this.hash(i+37)*.7);tree.position.x=x;tree.userData.offset=row*2.6;this.scene.add(tree);this.scenery.push(tree);
      if(i%3===0){const bush=new T.Group();this.ball(bush,.8,x,.4,0,'leaf2');bush.userData.offset=row*2.6+1;this.scene.add(bush);this.scenery.push(bush);}
    }
    // Distant mountains live behind the playable forest and share the same camera.
    for(let i=0;i<8;i++){const mountain=new T.Mesh(new T.ConeGeometry(15+i%3*4,20+i%4*5,5),new T.MeshStandardMaterial({color:0x90b5a0,flatShading:true}));mountain.position.set((i-3.5)*23,8,-115);this.scene.add(mountain);}
    this.obstacles=new Map();this.player=this.makePlayer();this.scene.add(this.player);
  }
  hash(n){return (Math.sin(n*127.1+311.7)*43758.5453)%1*.5+.5;}
  mesh(group,geometry,material,x,y,z,shadow=true){const m=new THREE.Mesh(geometry,this.materials[material]);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;group.add(m);return m;}
  box(g,w,h,d,x,y,z,mat,shadow=true){return this.mesh(g,new THREE.BoxGeometry(w,h,d),mat,x,y,z,shadow);}
  ball(g,r,x,y,z,mat){return this.mesh(g,new THREE.IcosahedronGeometry(r,0),mat,x,y,z);}
  tree(scale){const group=new THREE.Group();this.mesh(group,new THREE.CylinderGeometry(.17,.28,4.6,7),'bark',0,2.3,0);for(let i=0;i<3;i++){this.mesh(group,new THREE.ConeGeometry(1.9-i*.37,3.2,7),['leaf','leaf2','leaf3'][i],0,3.8+i*1.5,0);}group.scale.setScalar(scale);return group;}
  obstacle(type){const g=new THREE.Group();if(type==='log'){
    const trunk=this.mesh(g,new THREE.CylinderGeometry(.4,.47,1.9,10),'bark',0,.43,0);trunk.rotation.z=Math.PI/2;
    for(const x of [-.96,.96]){const cut=this.mesh(g,new THREE.CylinderGeometry(.33,.33,.015,10),'cut',x,.43,0);cut.rotation.z=Math.PI/2;}
    this.box(g,1.5,.11,.25,0,.81,0,'moss');
  }else{const rock=this.ball(g,1,0,1.27,0,'rock');rock.scale.set(.93,1.52,.77);rock.rotation.y=.4;const moss=this.ball(g,.58,-.12,2.38,0,'moss');moss.scale.set(1,.22,.9);}return g;}
  makePlayer(){const g=new THREE.Group();this.box(g,.65,.75,.4,0,1.13,0,'orange');this.box(g,.5,.57,.22,0,1.17,.31,'bag');this.box(g,.36,.22,.08,0,1.02,.45,'orange');this.box(g,.4,.36,.4,0,1.68,0,'skin');this.mesh(g,new THREE.CylinderGeometry(.43,.46,.09,12),'hat',0,1.85,0);this.mesh(g,new THREE.CylinderGeometry(.28,.32,.3,10),'hat',0,2.02,0);
    this.legs=[];this.arms=[];for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.18,.81,0);this.box(leg,.22,.56,.23,0,-.28,0,'pants');this.box(leg,.25,.17,.4,0,-.62,-.07,'boots');g.add(leg);this.legs.push(leg);const arm=new THREE.Group();arm.position.set(side*.43,1.44,0);this.box(arm,.2,.6,.22,0,-.27,0,'orange');g.add(arm);this.arms.push(arm);}return g;
  }
  resize(width,height){this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.fov=width/height<.65?65:53;this.camera.updateProjectionMatrix();}
  render(game,paused){
    for(const tile of this.tiles)tile.position.z=18-((tile.userData.offset-game.distance%168+168)%168);
    for(const item of this.scenery)item.position.z=14-((item.userData.offset-game.distance%156+156)%156);
    const active=new Set(game.obstacles);
    for(const [item,mesh]of this.obstacles)if(!active.has(item)){this.scene.remove(mesh);mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();});this.obstacles.delete(item);}
    for(const item of game.obstacles){let mesh=this.obstacles.get(item);if(!mesh){mesh=this.obstacle(item.type);this.obstacles.set(item,mesh);this.scene.add(mesh);}mesh.position.set(item.lane*2.4,0,game.distance-item.z);}
    const stride=game.state==='running'&&!paused?Math.sin(game.distance*2.4):0;
    this.player.position.set(game.x*2.4,game.height+(game.height===0?Math.abs(stride)*.035:0),0);
    this.player.rotation.z=(game.lane-game.x)*-.08;
    this.legs.forEach((leg,i)=>leg.rotation.x=game.height>0?(i?-.45:.6):stride*(i?-.65:.65));
    this.arms.forEach((arm,i)=>arm.rotation.x=game.height>0?-.7:stride*(i?.5:-.5));
    this.renderer.render(this.scene,this.camera);
  }
}
