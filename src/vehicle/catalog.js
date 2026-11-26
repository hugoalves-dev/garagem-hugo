export const modes = {
  overview: 'Visão geral', exterior: 'Exterior', interior: 'Interior',
  engine: 'Motor', underside: 'Parte inferior', electrical: 'Elétrica', chassis: 'Suspensão e freios'
};

const systems = {
  body: 'Carroceria / ferrugem', lights: 'Iluminação', wash: 'Limpadores e esguicho',
  wheels: 'Pneus e rodas', cabin: 'Rádio e acessórios', climate: 'Ar-condicionado',
  electric: 'Alarme / elétrica', obd: 'OBD2 / scanner', engine: 'Motor e versão',
  timing: 'Correia dentada', injection: 'Injeção / EPC', cooling: 'Arrefecimento',
  brakes: 'ABS e freios', transmission: 'Câmbio e embreagem',
  suspension: 'Suspensão e direção', frame: 'Chassi e identificação'
};

export const components = [];
function add(id, name, mode, system, optional = false, parent = null) {
  components.push({
    id, name, mode, system: systems[system], optional, parent,
    modes: ['overview', mode, ...(['lights', 'electric', 'obd', 'injection'].includes(system) && mode !== 'electrical' ? ['electrical'] : [])],
    meshes: ['fox_' + id.replaceAll('.', '_')]
  });
}
function batch(prefix, mode, rows) {
  for (const [key, name, system, optional] of rows) add(prefix + '.' + key, name, mode, system, optional);
}

batch('exterior', 'exterior', [
  ['bumper.front', 'Para-choque dianteiro', 'body'], ['bumper.rear', 'Para-choque traseiro', 'body'],
  ['hood', 'Capô', 'body'], ['roof', 'Teto', 'body'], ['trunk', 'Tampa do porta-malas', 'body'],
  ['windshield', 'Para-brisa', 'body'], ['window.rear', 'Vidro traseiro', 'body'],
  ['wiper.front', 'Limpadores dianteiros', 'wash'], ['wiper.rear', 'Limpador traseiro', 'wash'],
  ['washer_nozzles', 'Bicos do esguicho', 'wash']
]);

for (const [side, sideName] of [['left', 'esquerdo'], ['right', 'direito']]) {
  for (const [axle, axleName] of [['front', 'dianteiro'], ['rear', 'traseiro']]) {
    const key = axle + '_' + side;
    const position = axleName + ' ' + sideName;
    add('exterior.door.' + key, 'Porta ' + position.replaceAll(/(dianteir|traseir|esquerd|direit)o/g, '$1a'), 'exterior', 'body', axle === 'rear');
    add('exterior.window.' + key, 'Vidro ' + position, 'exterior', 'body', axle === 'rear', 'exterior.door.' + key);
    add('exterior.fender.' + key, 'Paralama ' + position, 'exterior', 'body');
    add('exterior.wheel.' + key, 'Roda ' + position.replaceAll(/(dianteir|traseir|esquerd|direit)o/g, '$1a'), 'exterior', 'wheels');
    add('exterior.tire.' + key, 'Pneu ' + position, 'exterior', 'wheels', false, 'exterior.wheel.' + key);
    add('exterior.turn_signal.' + key, 'Seta ' + position.replaceAll(/(dianteir|traseir|esquerd|direit)o/g, '$1a'), 'exterior', 'lights');
    add('suspension.shock.' + key, 'Amortecedor ' + position, 'chassis', 'suspension');
    add('suspension.spring.' + key, 'Mola ' + position.replaceAll(/(dianteir|traseir|esquerd|direit)o/g, '$1a'), 'chassis', 'suspension');
    add('suspension.bearing.' + key, 'Rolamento ' + position, 'chassis', 'suspension');
    if (axle === 'front') {
      add('brakes.' + key + '.disc', 'Disco ' + position, 'chassis', 'brakes');
      add('brakes.' + key + '.pads', 'Pastilhas · ' + position, 'chassis', 'brakes', false, 'brakes.' + key + '.disc');
    } else add('brakes.' + key + '.assembly', 'Conjunto de freio · ' + position, 'chassis', 'brakes');
  }
  add('exterior.headlight.' + side, 'Farol ' + sideName, 'exterior', 'lights');
  add('exterior.tail_light.' + side, 'Lanterna ' + sideName.replace(/o$/, 'a'), 'exterior', 'lights');
  add('exterior.mirror.' + side, 'Retrovisor ' + sideName, 'exterior', 'body');
  add('electrical.alarm.ultrasonic_' + side, 'Sensor ultrassônico · ' + sideName, 'electrical', 'electric', true);
  add('interior.speaker.' + side, 'Alto-falante ' + sideName, 'interior', 'cabin', true);
}

batch('interior', 'interior', [
  ['steering_wheel', 'Volante', 'suspension'], ['instrument_cluster', 'Quadro de instrumentos', 'electric'],
  ['dashboard', 'Painel', 'body'], ['radio', 'Rádio ou multimídia', 'cabin', true],
  ['climate_controls', 'Comandos da ventilação', 'climate'], ['vents', 'Saídas de ar', 'climate'],
  ['seat.driver', 'Banco do motorista', 'body'], ['seat.passenger', 'Banco do passageiro', 'body'],
  ['seat.rear', 'Banco traseiro', 'body'], ['seat_belts', 'Cintos de segurança', 'body'],
  ['pedals', 'Pedais', 'transmission'], ['gear_lever', 'Alavanca de câmbio', 'transmission'],
  ['handbrake', 'Freio de mão', 'brakes'], ['lighting', 'Luz interna', 'lights'],
  ['power_socket_12v', 'Tomada 12 V', 'cabin', true], ['obd2', 'Conector de diagnóstico', 'obd']
]);

batch('engine', 'engine', [
  ['block', 'Bloco do motor', 'engine'], ['head', 'Cabeçote', 'engine'],
  ['timing_belt', 'Conjunto da correia dentada', 'timing'], ['accessory_belt', 'Correia de acessórios', 'engine'],
  ['alternator', 'Alternador', 'electric'], ['battery', 'Bateria', 'electric'],
  ['starter', 'Motor de partida', 'electric'], ['air_filter', 'Filtro de ar', 'engine'],
  ['intake', 'Admissão de ar', 'engine'], ['ignition', 'Ignição', 'injection'],
  ['injection', 'Injeção de combustível', 'injection'], ['oil', 'Sistema de óleo', 'engine'],
  ['ac_compressor', 'Compressor do ar-condicionado', 'climate', true],
  ['washer_reservoir', 'Reservatório do esguicho', 'wash'], ['transmission', 'Câmbio', 'transmission']
]);
add('brakes.fluid_reservoir', 'Reservatório de fluido de freio', 'engine', 'brakes');

batch('cooling', 'engine', [
  ['expansion_tank', 'Reservatório de expansão', 'cooling'], ['radiator', 'Radiador', 'cooling'],
  ['fan', 'Ventoinha', 'cooling'], ['hoses', 'Mangueiras do arrefecimento', 'cooling'],
  ['water_pump', 'Bomba d’água', 'cooling'], ['thermostat', 'Válvula termostática', 'cooling']
]);

batch('suspension', 'chassis', [
  ['front', 'Suspensão dianteira', 'suspension'], ['rear', 'Suspensão traseira', 'suspension'],
  ['bushings', 'Buchas', 'suspension'], ['steering', 'Caixa de direção', 'suspension'],
  ['driveshafts', 'Semieixos', 'transmission'], ['cv_joints', 'Juntas homocinéticas', 'transmission']
]);
batch('underbody', 'underside', [
  ['exhaust', 'Escapamento', 'engine'], ['catalytic_converter', 'Catalisador', 'engine'],
  ['fuel_tank', 'Tanque de combustível', 'injection'], ['chassis', 'Longarinas e chassi', 'frame'],
  ['floor', 'Assoalho', 'body']
]);

export const byId = new Map(components.map(c => [c.id, c]));
export const byMesh = new Map(components.flatMap(c => c.meshes.map(mesh => [mesh, c])));

export function isRearDoor(id) {
  return id?.startsWith('exterior.door.rear_') || false;
}

export function isUnconfirmed(component, sideDoors) {
  if (sideDoors === 2 || sideDoors === 4) {
    if (isRearDoor(component.id) || isRearDoor(component.parent)) return false;
  }
  return component.optional;
}
