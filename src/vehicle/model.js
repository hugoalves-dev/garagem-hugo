import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { byId, components, isRearDoor } from './catalog.js';

const paint = 0xb52b37, dark = 0x242d37, metal = 0x8999a5, glass = 0x39586b;
const sideX = { left: -1, right: 1 };
const axleZ = { front: 1.18, rear: -1.22 };

export function makeFox(sideDoors = 4) {
  const root = new T.Group(), parts = new Map(), hinges = new Map();
  function part(id, factory, hinge) {
    const component = byId.get(id);
    const pivot = new T.Group();
    const group = new T.Group();
    group.name = component.meshes[0];
    if (hinge) {
      pivot.position.set(...hinge.point);
      group.position.copy(pivot.position).negate();
      hinges.set(id, { pivot, ...hinge });
    }
    pivot.add(group); root.add(pivot);
    const meshes = [];
    function mesh(geometry, color, position, rotation) {
      const object = new T.Mesh(geometry, new T.MeshStandardMaterial({
        color, roughness: color === paint ? 0.48 : color === glass ? 0.5 : 0.65, metalness: color === paint ? 0.32 : 0.15,
        side: T.DoubleSide
      }));
      object.position.set(...position);
      if (rotation) object.rotation.set(...rotation);
      object.userData.componentId = id;
      group.add(object); meshes.push(object);
      return object;
    }
    const box = (position, size, color = dark, rotation) => mesh(new T.BoxGeometry(...size), color, position, rotation);
    const cylinder = (position, diameter, depth, color = metal, axis = 'y') => mesh(
      new T.CylinderGeometry(diameter / 2, diameter / 2, depth, 20), color, position,
      axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : null
    );
    const ring = (position, radius, tube, color = dark, axis = 'x') => mesh(
      new T.TorusGeometry(radius, tube, 10, 32), color, position,
      axis === 'x' ? [0, Math.PI / 2, 0] : axis === 'y' ? [Math.PI / 2, 0, 0] : null
    );
    const ball = (position, size, color = metal) => {
      const sphere = mesh(new T.SphereGeometry(1, 16, 10), color, position);
      sphere.scale.set(...size);
    };
    function panel(points, color = paint) {
      const geometry = new T.BufferGeometry();
      const center = new T.Vector3();
      for (const p of points) center.add(new T.Vector3(...p));
      center.divideScalar(points.length);
      geometry.setAttribute('position', new T.Float32BufferAttribute([...center.toArray(), ...points.flat()], 3));
      geometry.setIndex(points.flatMap((_, i) => [0, i + 1, (i + 1) % points.length + 1]));
      geometry.computeVertexNormals();
      mesh(geometry, color, [0, 0, 0]);
    }
    function tube(points, radius, color = dark) {
      const path = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
      mesh(new T.TubeGeometry(path, Math.max(6, points.length * 3), radius, 8), color, [0, 0, 0]);
    }
    factory({ box, cylinder, ring, ball, panel, tube });
    if (meshes.length > 1) {
      const byColor = new Map();
      for (const mesh of meshes) {
        const key = mesh.material.color.getHex();
        if (!byColor.has(key)) byColor.set(key, []);
        byColor.get(key).push(mesh);
      }
      meshes.length = 0;
      for (const objects of byColor.values()) {
        const [first, ...rest] = objects;
        if (!rest.length) {
          meshes.push(first);
          continue;
        }
        for (const object of objects) {
          object.updateMatrix();
          object.geometry.applyMatrix4(object.matrix);
          object.geometry.deleteAttribute('uv');
          group.remove(object);
        }
        const geometry = mergeGeometries(objects.map(object => object.geometry));
        for (const object of objects) object.geometry.dispose();
        for (const object of rest) object.material.dispose();
        const merged = new T.Mesh(geometry, first.material);
        merged.userData.componentId = id;
        group.add(merged);
        meshes.push(merged);
      }
    }
    parts.set(id, { component, pivot, group, meshes, home: pivot.position.clone() });
  }

  part('exterior.hood', ({ panel }) => panel([
    [-.82, 1.03, 1.88], [-.51, 1.08, 2.01], [.51, 1.08, 2.01], [.82, 1.03, 1.88],
    [.85, 1.28, .82], [.64, 1.32, .77], [-.64, 1.32, .77], [-.85, 1.28, .82]
  ]), { point: [0, 1.29, .79], axis: 'x', angle: -1.03 });
  part('exterior.roof', ({ panel, tube }) => {
    panel([[-.69, 1.85, .24], [.69, 1.85, .24], [.72, 1.85, -.94], [.66, 1.78, -1.43], [-.66, 1.78, -1.43], [-.72, 1.85, -.94]]);
    for (const x of [-1, 1]) tube([[x*.83, 1.28, .79], [x*.69, 1.85, .24], [x*.72, 1.85, -.94], [x*.66, 1.78, -1.43], [x*.84, 1.21, -1.81]], .034, paint);
  });
  part('exterior.windshield', ({ panel }) => panel([[-.80, 1.30, .78], [.80, 1.30, .78], [.66, 1.835, .24], [-.66, 1.835, .24]], glass));
  const hatch = { point: [0, 1.78, -1.43], axis: 'x', angle: 1.15 };
  part('exterior.trunk', ({ panel, box }) => {
    panel([[-.83, 1.23, -1.82], [.83, 1.23, -1.82], [.81, .65, -1.91], [.59, .61, -1.98], [-.59, .61, -1.98], [-.81, .65, -1.91]]);
    box([0, .83, -1.967], [.36, .115, .026], 0xd9e0e3);
    box([0, 1.12, -1.855], [.14, .032, .026], dark);
  }, hatch);
  part('exterior.window.rear', ({ panel }) => panel([[-.73, 1.25, -1.826], [.73, 1.25, -1.826], [.62, 1.76, -1.455], [-.62, 1.76, -1.455]], glass), hatch);
  const nose = x => 2.065 - .25 * (x / .89)**2;
  part('exterior.bumper.front', ({ panel, box, cylinder, tube }) => {
    for (let i = 0; i < 20; i++) {
      const x = -.89 + i * .089, n = x + .089;
      const contour = v => {
        const edge = (v / .89)**2;
        return [[v,.46+.08*edge,nose(v)-.067], [v,.57+.02*edge,nose(v)-.008],
          [v,.87-.015*edge,nose(v)], [v,1.066-.053*edge,nose(v)-.056]];
      };
      const left = contour(x), right = contour(n);
      for (let row = 0; row < 3; row++) panel([left[row],right[row],right[row+1],left[row+1]]);
    }
    const bars = (width, y, radius, color) => tube(
      Array.from({ length:9 }, (_,i) => {
        const x = (i/8-.5)*width;
        return [x,y+.07*(x/.89)**2,nose(x)+.011];
      }), radius,color);
    for (const y of [.907,.952,.996]) bars(.88,y,.022,dark);
    for (const y of [.931,.975]) bars(.87,y,.009,paint);
    for (const y of [.548,.582,.615]) bars(.91,y,.013,dark);
    for (const x of [-.62,.62]) box([x,.566,nose(x)+.006],[.19,.072,.028],dark,[0,x*.46,0]);
    cylinder([0,.969,2.089], .122, .021, metal, 'z');
    box([0,.747,2.068],[.32,.107,.024],0xd7e1e4);
    box([0,.747,2.082],[.298,.085,.007],0x405566);
  });
  part('exterior.bumper.rear', ({ panel, box }) => {
    panel([[-.88, .65, -1.80], [-.59, .68, -1.98], [.59, .68, -1.98], [.88, .65, -1.80],
      [.84, .43, -1.81], [.57, .39, -1.95], [-.57, .39, -1.95], [-.84, .43, -1.81]]);
    box([0, .48, -1.959], [.89, .06, .03], dark);
  });
  part('exterior.wiper.front', ({ tube }) => {
    for (const x of [-.5, .19]) tube([[x, 1.315, .775], [x+.14, 1.38, .718], [x+.43, 1.4, .701]], .013);
  });
  part('exterior.wiper.rear', ({ tube }) => tube([[.05, 1.26, -1.832], [-.07, 1.34, -1.782], [-.48, 1.38, -1.753]], .013), hatch);
  part('exterior.washer_nozzles', ({ ball }) => { for (const x of [-.4, .4]) ball([x, 1.315, .92], [.026, .013, .018], dark); },
    { point: [0, 1.29, .79], axis: 'x', angle: -1.03 });

  for (const [side, sign] of Object.entries(sideX)) {
    const x = sign * .865;
    part('exterior.mirror.' + side, ({ ball, box }) => {
      box([sign*.89, 1.323, .58], [.15, .06, .085]);
      ball([sign*.992, 1.354, .56], [.12, .072, .087], paint);
      ball([sign*1.002, 1.356, .495], [.094, .054, .018], metal);
    }, { point: [x, .92, .75], axis: 'y', angle: -sign*1.14 });
    part('exterior.headlight.' + side, ({ panel, ball }) => {
      panel([[sign*.431,.873,1.997], [sign*.436,.927,2.012], [sign*.548,1.019,1.988],
        [sign*.762,1.051,1.906], [sign*.869,1.012,1.874], [sign*.862,.907,1.858],
        [sign*.758,.874,1.911], [sign*.568,.864,1.969]], 0xc1d1dc);
      ball([sign*.572,.936,1.984],[.068,.046,.018],0xe0edf3);
      ball([sign*.729,.952,1.929],[.057,.049,.019],0xdbe9ef);
    });
    part('exterior.tail_light.' + side, ({ panel }) => panel([
      [sign*.69, 1.33, -1.823], [sign*.835, 1.24, -1.828], [sign*.874, .85, -1.854],
      [sign*.724, .83, -1.964], [sign*.688, 1.01, -1.933]
    ], 0xc71b2f));

    for (const [axle, z] of Object.entries(axleZ)) {
      const front = axle === 'front';
      const key = axle + '_' + side;
      const hinge = { point: [x, .92, front ? .75 : -.16], axis: 'y', angle: -sign*1.14 };
      const twoDoors = sideDoors === 2;
      const start = front ? (twoDoors ? -.44 : -.14) : -1.22;
      const end = front ? .74 : (twoDoors ? -.47 : -.17);
      const lower = (v, y) => [sign*.881, y, v];
      if (front || !twoDoors) part('exterior.door.' + key, ({ panel, box }) => {
        panel([lower(start, .56), lower(end, .56), lower(end, 1.286), lower(start, 1.286)]);
        box([sign*.891, 1.173, start+.129], [.03, .03, .14], dark);
        box([sign*.887, .727, (start+end)/2], [.028, .047, end-start-.065], 0x30323a);
      }, hinge);
      part('exterior.window.' + key, ({ panel, tube }) => {
        const points = front
          ? [[sign*.86, 1.30, start+.014], [sign*.85, 1.30, end-.027], [sign*.68, 1.818, .223], [sign*.7, 1.826, start+.02]]
          : [[sign*.86, 1.30, start+.022], [sign*.86, 1.30, end-.012], [sign*.708, 1.828, end-.015], [sign*.705, 1.815, start+.07]];
        panel(points, glass); tube([...points, points[0]], .017);
      }, front || !twoDoors ? hinge : null);
      part('exterior.fender.' + key, ({ panel }) => {
        const width = t => sign * (.885 - .052 * Math.max(0, Math.abs(t-z)-.33));
        for (let i = 0; i < 14; i++) {
          const a = Math.PI*i/14, b = Math.PI*(i+1)/14;
          const u = z+.381*Math.cos(a), v = z+.381*Math.cos(b);
          const top = t => front ? 1.23-.18*Math.max(0, t-.86) : 1.27;
          panel([[width(u), .4+.35*Math.sin(a), u], [width(v), .4+.35*Math.sin(b), v],
            [width(v)-sign*.02, top(v), v], [width(u)-sign*.02, top(u), u]]);
        }
        const endZ = front ? 1.88 : -1.85, archZ = z + (front ? .38 : -.38);
        panel([[width(archZ), .4, archZ], [width(endZ), .54, endZ], [width(endZ), 1.06, endZ], [width(archZ), front ? 1.10 : 1.27, archZ]]);
        if (!front && twoDoors) {
          panel([lower(start, .56), lower(end, .56), lower(end, 1.286), lower(start, 1.286)]);
          panel([[sign*.86,1.285,end], [sign*.70,1.826,end], [sign*.70,1.826,end+.03], [sign*.86,1.285,end+.03]]);
        }
        if (!front) panel([[sign*.865, 1.285, -1.225], [sign*.676, 1.776, -1.36], [sign*.663, 1.77, -1.45], [sign*.84, 1.21, -1.81]]);
      });
      part('exterior.turn_signal.' + key, ({ box }) => box(
        front ? [sign*.823, .945, 1.885] : [sign*.803, 1.008, -1.914], [.075, .049, .028], 0xffa745));
      part('exterior.tire.' + key, ({ ring, cylinder }) => {
        ring([sign*.824, .365, z], .264, .08, 0x151923);
        ring([sign*.893, .365, z], .273, .026, 0x2b3037);
        cylinder([sign*.819, .365, z], .6, .135, 0x191d25, 'x');
      });
      part('exterior.wheel.' + key, ({ ring, cylinder, box }) => {
        ring([sign*.923, .365, z], .191, .018, metal);
        cylinder([sign*.918, .365, z], .127, .036, metal, 'x');
        for (let j = 0; j < 7; j++) {
          const a = j*2*Math.PI/7;
          box([sign*.922, .365+.119*Math.cos(a), z+.119*Math.sin(a)], [.028, .144, .047], metal, [a,0,0]);
        }
      });
      const sx = sign*.66;
      part('suspension.shock.' + key, ({ cylinder }) => {
        cylinder([sx,.51,z], .075,.28,dark); cylinder([sx,.69,z], .041,.2);
      });
      part('suspension.spring.' + key, ({ tube }) => {
        const points = Array.from({ length: 41 }, (_, i) => [sx+.078*Math.cos(i*Math.PI/5),.45+i*.0078,z+.078*Math.sin(i*Math.PI/5)]);
        tube(points, .013, 0x558da3);
      });
      part('suspension.bearing.' + key, ({ ring }) => ring([sign*.718,.365,z], .068,.022,metal));
      if (front) {
        part('brakes.' + key + '.disc', ({ cylinder, ring }) => {
          cylinder([sign*.758,.365,z], .32,.032,metal,'x'); ring([sign*.78,.365,z], .122,.009,0xb9c4c9);
        });
        part('brakes.' + key + '.pads', ({ box }) => box([sign*.766,.409,z-.139], [.08,.11,.072],0xa45542));
      } else part('brakes.' + key + '.assembly', ({ cylinder }) => cylinder([sign*.759,.365,z], .29,.087,metal,'x'));
    }

    part('interior.speaker.' + side, ({ cylinder }) => cylinder([sign*.79,.79,.4], .15,.04, dark, 'x'));
    part('electrical.alarm.ultrasonic_' + side, ({ ball }) => ball([sign*.64,1.688,.28], [.052,.036,.041]));
  }

  const boxes = {
    'interior.dashboard': [[0,1.13,.59],[1.51,.21,.32],dark],
    'interior.instrument_cluster': [[-.42,1.273,.46],[.26,.105,.048],0x6b96a6],
    'interior.radio': [[0,1.13,.403],[.23,.096,.044],0x587485],
    'interior.climate_controls': [[0,1.014,.412],[.23,.081,.045],0x59636c],
    'interior.vents': [[0,1.24,.428],[.25,.051,.043],0x85919b],
    'interior.lighting': [[0,1.792,-.12],[.19,.033,.088],0xe9dcbb],
    'interior.obd2': [[-.53,.903,.421],[.109,.046,.059],0x8569a5],
    'interior.power_socket_12v': [[.12,.832,.167],[.058,.054,.06],metal],
    'interior.handbrake': [[.09,.712,-.39],[.046,.049,.25],dark],
    'engine.block': [[-.2,.71,1.21],[.62,.31,.53],metal],
    'engine.head': [[-.2,.908,1.21],[.67,.123,.43],0x40474f],
    'engine.timing_belt': [[-.58,.798,1.26],[.11,.34,.26],dark],
    'engine.accessory_belt': [[-.62,.681,1.48],[.043,.24,.108],0x2d333a],
    'engine.battery': [[.55,.92,1.18],[.29,.237,.28],0x414a52],
    'engine.air_filter': [[.04,1.036,1.03],[.46,.104,.25],0x31393f],
    'engine.injection': [[-.184,.941,1.483],[.486,.071,.077],0x7592a6],
    'engine.oil': [[-.2,.555,1.22],[.44,.112,.34],0x526475],
    'engine.transmission': [[.267,.634,1.21],[.329,.281,.393],metal],
    'engine.washer_reservoir': [[.648,.846,1.55],[.13,.24,.164],0xcddbe3],
    'brakes.fluid_reservoir': [[-.6,.982,.907],[.118,.103,.149],0xdaceb1],
    'cooling.radiator': [[0,.797,1.758],[1.22,.365,.074],0x667987],
    'underbody.fuel_tank': [[0,.449,-.938],[.91,.202,.49],0x56626a],
    'underbody.floor': [[0,.559,-.356],[1.69,.084,2.392],0x753b46],
    'suspension.rear': [[0,.355,-1.27],[1.42,.07,.143],0x646e78]
  };
  for (const [id, [p, size, color]] of Object.entries(boxes)) part(id, ({ box, cylinder }) => {
    box(p,size,color);
    if (id === 'engine.battery') for (const x of [.455,.645]) cylinder([x,1.052,1.1], .043,.029,x < .5 ? 0xdb555f : metal);
    if (id === 'cooling.radiator') for (let i = 0; i < 13; i++) box([-.54+i*.09,.796,1.802],[.021,.316,.024],dark);
  });
  for (const [id, x, width, z] of [['driver',-.416,.51,-.035], ['passenger',.416,.51,-.035], ['rear',0,1.39,-1.13]]) {
    part('interior.seat.' + id, ({ box }) => {
      box([x,.738,z],[width,.16,.47],0x555761);
      box([x,.998,z-.237],[width,.49,.143],0x454851,[-.16,0,0]);
      box([x,1.292,z-.253],[width*.42,.139,.12],dark);
    });
  }
  part('interior.steering_wheel', ({ ring, box }) => {
    ring([-.42,1.157,.328], .148,.021,dark,'z');
    box([-.42,1.15,.328],[.245,.044,.028],dark);
  });
  part('interior.seat_belts', ({ tube }) => {
    for (const x of [-.743,.743]) tube([[x,1.453,-.26],[x,.957,-.19],[x*.8,.75,-.16]],.016,0x303035);
  });
  part('interior.pedals', ({ box }) => {
    for (const x of [-.52,-.42,-.32]) box([x,.725,.635],[.07,.1,.024],metal,[-.27,0,0]);
  });
  part('interior.gear_lever', ({ cylinder, ball }) => {
    cylinder([0,.745,.232],.03,.174); ball([0,.846,.232],[.043,.038,.042],dark);
  });
  part('cooling.expansion_tank', ({ ball, cylinder }) => {
    ball([.55,.986,.877],[.126,.123,.123],0xe2c7aa); cylinder([.55,1.105,.877],.091,.036,0x456d9e);
  });
  part('cooling.fan', ({ ring, cylinder, box }) => {
    ring([0,.79,1.693],.147,.014,dark,'z'); cylinder([0,.79,1.667],.084,.043,dark,'z');
    for (let i=0;i<5;i++) {
      const a=i*2*Math.PI/5;
      box([.092*Math.cos(a),.79+.092*Math.sin(a),1.66],[.104,.042,.026],dark,[0,0,a]);
    }
  });
  const rounds = {
    'engine.alternator': [[-.5,.695,1.485],.136,.12,'x'],
    'engine.starter': [[.237,.61,1.484],.12,.172,'x'],
    'engine.ac_compressor': [[-.411,.57,1.51],.143,.109,'x'],
    'cooling.water_pump': [[-.461,.781,1.452],.12,.092,'x'],
    'cooling.thermostat': [[.204,.887,1.487],.09,.093,'z'],
    'underbody.catalytic_converter': [[-.122,.378,.807],.172,.27,'z'],
    'suspension.steering': [[0,.433,1.004],.081,1.19,'x']
  };
  for (const [id,[p,d,l,axis]] of Object.entries(rounds)) part(id, ({ cylinder }) => cylinder(p,d,l,metal,axis));
  part('engine.intake', ({ tube }) => tube([[.29,1.001,1.03],[.4,.983,1.078],[.368,.963,1.292],[.2,.919,1.315]],.057));
  part('engine.ignition', ({ tube }) => {
    for (let i=0;i<4;i++) tube([[-.439+i*.146,.993,1.315],[-.439+i*.146,1.008,1.407],[-.326,.989,1.464]],.013,0x5786ac);
  });
  part('cooling.hoses', ({ tube }) => {
    tube([[.551,.917,.868],[.685,.797,1.15],[.59,.789,1.57],[.475,.797,1.721]],.028);
    tube([[-.33,.721,1.721],[-.368,.708,1.58],[-.288,.763,1.477]],.03);
  });
  part('underbody.exhaust', ({ tube, cylinder }) => {
    tube([[-.12,.375,1.1],[-.12,.362,.55],[.064,.348,-.37],[.23,.367,-1.3],[.33,.354,-1.967]],.035,metal);
    cylinder([.287,.367,-1.54],.165,.37,metal,'z');
  });
  part('underbody.chassis', ({ box }) => { for (const x of [-.61,.61]) box([x,.504,0],[.118,.143,3.49],metal); });
  part('suspension.front', ({ tube }) => {
    for (const x of [-1,1]) tube([[x*.29,.423,1.047],[x*.67,.345,1.18],[x*.43,.387,1.396]],.037,metal);
  });
  part('suspension.driveshafts', ({ cylinder }) => cylinder([0,.395,1.18],.054,1.4,metal,'x'));
  part('suspension.cv_joints', ({ ball }) => { for (const x of [-.60,.60]) ball([x,.395,1.18],[.083,.058,.06],dark); });
  part('suspension.bushings', ({ ring }) => {
    for (const x of [-.46,.46]) for (const z of [-1.27,1.044]) ring([x,.408,z],.046,.016,dark,'x');
  });

  for (const c of components) if (!parts.has(c.id) && !(sideDoors === 2 && isRearDoor(c.id))) throw new Error('Componente sem geometria: ' + c.id);
  const bounds = new T.Box3();
  root.updateMatrixWorld(true);
  for (const p of parts.values()) {
    p.center = bounds.setFromObject(p.group).getCenter(new T.Vector3());
    p.scatter = p.center.clone().sub(new T.Vector3(0,.64,0)).multiply(new T.Vector3(.77,.86,.26));
  }
  return { root, parts, hinges };
}
