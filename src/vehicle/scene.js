import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeFox } from './model.js';
import { statuses } from './status.js';

const views = {
  overview: [[3.5,2.6,4.9],[0,.85,0]], exterior: [[3.5,2.2,4.9],[0,.85,0]],
  interior: [[2.5,3.4,-2.5],[0,.95,-.5]], engine: [[2.2,2.8,3.3],[0,.8,1.08]],
  underside: [[2.6,-3.5,2.8],[0,.4,0]], electrical: [[2.8,3.1,3.5],[0,.88,.45]],
  chassis: [[3.6,.05,3.8],[0,.45,0]]
};
const cutaways = {
  interior: ['exterior.roof', 'exterior.windshield', 'exterior.window.rear'],
  electrical: ['exterior.roof','exterior.hood','exterior.windshield'],
  chassis: ['exterior.roof', 'underbody.floor']
};
const shell = c => c.mode === 'exterior' && !/wheel|tire|light|signal/.test(c.id);
const frontStructure = /^(exterior\.(bumper\.front|fender\.front|hood|wheel\.front|tire\.front|headlight|washer_nozzles))/;
const cabinStructure = /^(exterior\.(door|fender|trunk)|underbody\.floor)/;

function partInMode(component, options) {
  const { id, mode } = component;
  if (component.modes.includes(options.mode)) return true;
  if (options.mode === 'exterior') {
    if (mode === 'engine') return options.open.has('exterior.hood');
    if (mode === 'interior' || id === 'underbody.floor') return [...options.open].some(id => /door|trunk/.test(id));
  }
  if (options.mode === 'interior') return cabinStructure.test(id);
  if (options.mode === 'engine') return frontStructure.test(id);
  if (options.mode === 'underside') return mode === 'chassis' || /^exterior\.(wheel|tire)/.test(id);
  if (options.mode === 'chassis') return mode === 'underside';
  return false;
}

export function createScene(host, { onPick, onHover, onFailure, onRestore, onLabel }) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', 'Modelo interativo. Use o catálogo para selecionar com o teclado.');
  canvas.setAttribute('role', 'img');
  host.prepend(canvas);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(37, 1, .035, 40);
  const controls = new OrbitControls(camera, canvas);
  controls.minDistance = .26;
  controls.maxDistance = 13;
  const lights = [[0xffe6d3, 2.4, [1,5,4]], [0x8dbdff, 1.5, [-4,2,-3]], [0xe1ecff,1.25,[0,-3,3]]];
  scene.add(new T.HemisphereLight(0xe0eeff,0x646775,1.84));
  for (const [color,intensity,pos] of lights) {
    const light = new T.DirectionalLight(color,intensity); light.position.set(...pos); scene.add(light);
  }
  const grid = new T.GridHelper(12, 28, 0x324458, 0x243244);
  scene.add(grid);
  const { root, parts, hinges } = makeFox();
  scene.add(root);
  const ray = new T.Raycaster(), pointer = new T.Vector2();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const position = new T.Vector3(), labelBounds = new T.Box3();
  let previousMode;
  let options, active = true, lost = false, frame = 0, hovered, tween;
  const pointers = new Set();
  let down;
  const modelMeshes = [...parts.values()].flatMap(p => p.meshes);
  for (const mesh of modelMeshes) mesh.userData.base = mesh.material.color.clone();

  function invalidate() {
    if (active && !lost && !frame) frame = requestAnimationFrame(draw);
  }
  function resize() {
    if (!host.clientWidth || !host.clientHeight) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, host.clientWidth < 640 ? 1.25 : 1.65));
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix(); invalidate();
  }
  function cameraTo(position, target, immediate = false) {
    tween = immediate || reducedMotion.matches ? null : {
      start: performance.now(), from: camera.position.clone(), targetFrom: controls.target.clone(),
      to: position, target
    };
    if (!tween) {
      camera.position.copy(position); controls.target.copy(target); controls.update();
    }
    invalidate();
  }
  function reset(immediate) {
    const [p,t] = views[options?.mode || 'overview'];
    cameraTo(new T.Vector3(...p), new T.Vector3(...t), immediate);
  }
  function focus(id) {
    const p = parts.get(id);
    if (!p) return;
    root.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(p.group);
    const target = box.getCenter(new T.Vector3());
    const direction = camera.position.clone().sub(controls.target).normalize();
    const size = box.getSize(new T.Vector3()).length();
    const distance = Math.max(1.02, Math.min(4.8, size*1.65)) * Math.max(1, .72/camera.aspect);
    cameraTo(target.clone().addScaledVector(direction, distance), target);
  }
  function draw(time) {
    frame = 0;
    if (!active || lost || !options) return;
    let moving = false;
    if (tween) {
      const progress = Math.min(1,(time-tween.start)/440), ease = 1-(1-progress)**3;
      camera.position.lerpVectors(tween.from,tween.to,ease);
      controls.target.lerpVectors(tween.targetFrom,tween.target,ease);
      controls.update();
      if (progress === 1) tween = null;
      else moving = true;
    }
    const factor = reducedMotion.matches ? 1 : .18;
    for (const [id,p] of parts) {
      const h = hinges.get(id);
      if (h) {
        const target = options.open.has(id) ? h.angle : 0;
        const current = h.pivot.rotation[h.axis];
        if (Math.abs(current-target) > .002) moving = true;
        h.pivot.rotation[h.axis] = Math.abs(current-target) < .002 ? target : T.MathUtils.lerp(current,target,factor);
      }
      const location = position.copy(p.home);
      if (options.exploded && p.group.visible) location.add(p.scatter);
      if (location.distanceToSquared(p.pivot.position) > .00001) moving = true;
      p.pivot.position.lerp(location, factor);
    }
    renderer.render(scene,camera);
    const label = options.labels && parts.get(options.selected || hovered);
    if (label?.group.visible) {
      const p = labelBounds.setFromObject(label.group).getCenter(position).project(camera);
      onLabel(label.component.name, (p.x+1)/2*100, (1-p.y)/2*100, p.z < 1 && Math.abs(p.x)<.94 && Math.abs(p.y)<.9);
    } else onLabel('', 0, 0, false);
    if (moving) invalidate();
  }
  function update(next) {
    const changedMode = previousMode && previousMode !== next.mode;
    previousMode = next.mode;
    options = next;
    grid.visible = next.mode !== 'underside';
    for (const [id,p] of parts) {
      const c = p.component;
      const inMode = partInMode(c, next);
      const optionallyVisible = !c.optional || next.optional || id === next.selected || c.id.startsWith('exterior.');
      const bodyHidden = next.bodyHidden && shell(c);
      const cut = cutaways[next.mode]?.includes(id) ||
        ((next.mode === 'interior' || next.mode === 'electrical') && id.startsWith('exterior.window.'));
      p.group.visible = optionallyVisible && !next.hidden.has(c.mode) &&
        (next.filter === '' || (next.status.get(id) || 'unknown') === next.filter) &&
        (next.isolate ? id === next.selected : (id === next.selected || (inMode && !bodyHidden && !cut)));
      for (const mesh of p.meshes) {
        const material = mesh.material;
        material.color.copy(mesh.userData.base);
        if (next.overlay) material.color.set(statuses[next.status.get(id) || 'unknown'][1]);
        const bright = id === next.selected || id === hovered;
        material.emissive.set(bright ? (id === next.selected ? 0xe65835 : 0x66c4ff) : 0x000000);
        material.emissiveIntensity = bright ? .42 : 0;
        const transparent = next.xray && shell(c) && id !== next.selected;
        if (material.transparent !== transparent) {
          material.transparent = transparent; material.depthWrite = !transparent; material.needsUpdate = true;
        }
        material.opacity = transparent ? .19 : 1;
      }
    }
    if (changedMode) reset(false);
    invalidate();
  }
  function pick(event) {
    if (!options || lost) return null;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX-rect.left)/rect.width*2-1, 1-(event.clientY-rect.top)/rect.height*2);
    ray.setFromCamera(pointer,camera);
    const hits = ray.intersectObjects(modelMeshes.filter(m => m.parent.visible && !m.material.transparent),false);
    return hits[0]?.object.userData.componentId || null;
  }
  function hover(id) {
    if (id === hovered || !options) return;
    hovered = id; canvas.style.cursor = id ? 'pointer' : 'grab'; update(options); onHover(id);
  }
  canvas.addEventListener('pointermove', e => { if (!pointers.size && e.pointerType !== 'touch') hover(pick(e)); });
  canvas.addEventListener('pointerleave', () => { hover(null); if (down?.type === 'mouse') { down = null; pointers.clear(); } });
  canvas.addEventListener('pointerdown', e => {
    pointers.add(e.pointerId);
    down = pointers.size === 1 && e.button === 0 ? { x:e.clientX,y:e.clientY,id:e.pointerId,type:e.pointerType } : null;
  });
  canvas.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); down = null; });
  canvas.addEventListener('pointerup', e => {
    pointers.delete(e.pointerId);
    if (down?.id !== e.pointerId) return;
    const click = Math.hypot(e.clientX-down.x,e.clientY-down.y) < 6;
    down = null;
    if (click) { const id = pick(e); if (id) onPick(id); }
  });
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault(); lost = true; cancelAnimationFrame(frame); frame=0; onFailure();
  });
  canvas.addEventListener('webglcontextrestored', () => { lost=false; resize(); invalidate(); onRestore(); });
  controls.addEventListener('start', () => { tween=null; });
  controls.addEventListener('change', invalidate);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  reset(true); resize();

  return {
    update, reset, focus,
    setActive(value) {
      active=value; if (value) { resize(); invalidate(); }
      else { cancelAnimationFrame(frame); frame=0; pointers.clear(); down=null; }
    },
    dispose() {
      this.setActive(false); observer.disconnect(); controls.dispose();
      for (const m of [...modelMeshes,grid]) { m.geometry.dispose(); m.material.dispose(); }
      renderer.dispose(); canvas.remove();
    }
  };
}
