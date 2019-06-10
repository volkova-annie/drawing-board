import Vec3 from './vec3'
import * as math from 'mathjs';

export default class Camera {
  constructor(position, lookAt, up) {
    this.position = position;
    this.lookAt = lookAt;
    this.up = up;
  }

  get transform() {
    // const dirFromLookAt = Vec3.create().asSub(this.lookAt, this.position).normalize();

    const zAxis = Vec3.create().asSub(this.lookAt, this.position).normalize();
    const xAxis = Vec3.create().asCross(this.up, zAxis).normalize();
    const yAxis = Vec3.create().asCross(zAxis, xAxis).normalize();

    // const camPos = this.position;
    const camPos = Vec3.create().asAdd(this.lookAt, Vec3.create().addScaled(zAxis, this.position.z));

    let cameraMatrix = math.inv(math.matrix([
      [ xAxis.x,    xAxis.y,    xAxis.z,    0],
      [ yAxis.x,    yAxis.y,    yAxis.z,    0],
      [ zAxis.x,    zAxis.y,    zAxis.z,    0],
      [ camPos.x,   camPos.y,   camPos.z,   1]
    ]));


    //  cameraMatrix = math.transpose(cameraMatrix);
   //console.log(cameraMatrix);

    return cameraMatrix;
  }
}
