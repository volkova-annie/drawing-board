export const common = `
// https://www.shadertoy.com/view/Xd3GRf - формула для вычисления непрерывного simplex noise
lowp vec4 permute(in lowp vec4 x) {
  return mod(x*x*34.+x,289.);
}
lowp float snoise(in mediump vec3 v) {
  const lowp vec2 C = vec2(0.16666666666,0.33333333333);
  const lowp vec4 D = vec4(0,.5,1,2);
  lowp vec3 i  = floor(C.y*(v.x+v.y+v.z) + v);
  lowp vec3 x0 = C.x*(i.x+i.y+i.z) + (v - i);
  lowp vec3 g = step(x0.yzx, x0);
  lowp vec3 l = (1. - g).zxy;
  lowp vec3 i1 = min( g, l );
  lowp vec3 i2 = max( g, l );
  lowp vec3 x1 = x0 - i1 + C.x;
  lowp vec3 x2 = x0 - i2 + C.y;
  lowp vec3 x3 = x0 - D.yyy;
  i = mod(i,289.);
  lowp vec4 p = permute( permute( permute(
  i.z + vec4(0., i1.z, i2.z, 1.))
  + i.y + vec4(0., i1.y, i2.y, 1.))
  + i.x + vec4(0., i1.x, i2.x, 1.));
  lowp vec3 ns = .142857142857 * D.wyz - D.xzx;
  lowp vec4 j = -49. * floor(p * ns.z * ns.z) + p;
  lowp vec4 x_ = floor(j * ns.z);
  lowp vec4 x = x_ * ns.x + ns.yyyy;
  lowp vec4 y = floor(j - 7. * x_ ) * ns.x + ns.yyyy;
  lowp vec4 h = 1. - abs(x) - abs(y);
  lowp vec4 b0 = vec4( x.xy, y.xy );
  lowp vec4 b1 = vec4( x.zw, y.zw );
  lowp vec4 sh = -step(h, vec4(0));
  lowp vec4 a0 = b0.xzyw + (floor(b0)*2.+ 1.).xzyw*sh.xxyy;
  lowp vec4 a1 = b1.xzyw + (floor(b1)*2.+ 1.).xzyw*sh.zzww;
  lowp vec3 p0 = vec3(a0.xy,h.x);
  lowp vec3 p1 = vec3(a0.zw,h.y);
  lowp vec3 p2 = vec3(a1.xy,h.z);
  lowp vec3 p3 = vec3(a1.zw,h.w);
  lowp vec4 norm = inversesqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  lowp vec4 m = max(.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.);
  return .5 + 12. * dot( m * m * m, vec4( dot(p0,x0), dot(p1,x1),dot(p2,x2), dot(p3,x3) ) );
}

const float PI = 3.1415926535897932384626433832795;
float cloudsIntensity(vec3 pos, float time) {
  float noise = (snoise(pos * 1.0 ) + 0.5 * snoise(pos * 2.0) + 0.25 * snoise(pos * 4.0) + 0.25 * snoise(pos * 8.0))  * sin(time * PI) / 2.0;
  noise = clamp(noise + 0.1, 0.0, 1.0);

  if (noise <= 0.7) {
    noise = noise * smoothstep(0.5, 0.7, noise);
  }
  return noise;
}
`;

export const vertexShaderSource = `
// атрибут, который будет получать данные из буфера
attribute vec3 a_position;
attribute vec2 a_texCoord;

varying highp vec2 v_texCoord;

uniform bool u_flipY;
uniform mat3 u_transform;
uniform mediump vec2 u_resolution;

// все шейдеры имеют функцию main
void main() {
  vec3 transformedPosition = u_transform * a_position;
  transformedPosition.xy *= 2.0 / u_resolution;

  // gl_Position - специальная переменная вершинного шейдера,
  // которая отвечает за установку положения
  gl_Position = vec4(transformedPosition, 1.0);
  v_texCoord = vec2(a_texCoord.x, u_flipY ? 1.0 - a_texCoord.y : a_texCoord.y);
}`;

export const blurFragmentShaderSource = `
// фрагментные шейдеры не имеют точности по умолчанию, поэтому нам необходимо её
// указать. mediump подойдёт для большинства случаев. Он означает "средняя точность"

precision mediump float;

varying highp vec2 v_texCoord;

uniform sampler2D u_sampler;
uniform float     u_sigma;  // Gaussian sigma
uniform vec2      u_dir;    // horiz=(1.0, 0.0), vert=(0.0, 1.0)

#define PI 3.141593
#define MAX_STEPS 30

void main() {
  vec2 loc = v_texCoord; // center pixel cooordinate
  vec4 acc; // accumulator
  acc = texture2D(u_sampler, loc, 0.0); // accumulate center pixel
  if (u_sigma > 0.0) {
    for (int i = 1; i <= MAX_STEPS; i++) {
      float coeff = exp(-0.5 * float(i) * float(i) / (u_sigma * u_sigma));
      acc += (texture2D(u_sampler, loc - float(i) * u_dir)) * coeff; // L
      acc += (texture2D(u_sampler, loc + float(i) * u_dir)) * coeff; // R
    }
    acc *= 1.0 / (sqrt(2.0 * PI) * u_sigma); // normalize for unity gain
  }

  gl_FragColor = acc;
}`;

export const bwFragmentShaderSource = `
precision mediump float;

varying highp vec2 v_texCoord;

uniform sampler2D u_sampler;

void main() {
  vec2 loc = v_texCoord; // center pixel cooordinate
  vec3 acc = texture2D(u_sampler, loc, 0.0).rgb; // accumulate center pixel
  float bw = (acc.r + acc.g + acc.b) / 3.0; // берем сумму всех каналов и нормализуем его, чтобы значение было от 0 до 1

  gl_FragColor = vec4(vec3(bw), 1.0);
}`;

export const defaultFragmentShaderSource = `
precision mediump float;

varying highp vec2 v_texCoord;

uniform sampler2D u_sampler;

void main() {
  vec2 loc = v_texCoord; // center pixel cooordinate
  vec3 acc = texture2D(u_sampler, loc, 0.0).rgb; // accumulate center pixel

  gl_FragColor = vec4(acc, 1.0);
}`;

export const fxaaFragmentShaderSource = `
precision mediump float;

varying highp vec2 v_texCoord;

uniform sampler2D u_sampler;

uniform vec2 u_resolution;
uniform float u_quality[7];

float rgb2luma(vec3 rgb){
  return sqrt(dot(rgb, vec3(0.299, 0.587, 0.114)));
}

const float EDGE_THRESHOLD_MIN = 0.0312;
const float EDGE_THRESHOLD_MAX = 0.125;
const float SUBPIXEL_QUALITY = 0.75;
const int ITERATIONS = 7;

void main() {
  vec2 loc = v_texCoord; // center pixel cooordinate

  vec3 colorCenter = texture2D(u_sampler, loc).rgb;
  // Luma at the current fragment
  float lumaCenter = rgb2luma(colorCenter);

  vec2 invScreenSize = 1.0 / u_resolution;

  // Luma at the four direct neighbours of the current fragment.
  float lumaDown  = rgb2luma(texture2D(u_sampler,loc + invScreenSize * vec2(0.0,-1.0)).rgb);
  float lumaUp    = rgb2luma(texture2D(u_sampler,loc + invScreenSize * vec2(0.0,1.0)).rgb);
  float lumaLeft  = rgb2luma(texture2D(u_sampler,loc + invScreenSize * vec2(-1.0,0.0)).rgb);
  float lumaRight = rgb2luma(texture2D(u_sampler,loc + invScreenSize * vec2(1.0,0.0)).rgb);

  // Find the maximum and minimum luma around the current fragment.
  float lumaMin = min(lumaCenter,min(min(lumaDown,lumaUp),min(lumaLeft,lumaRight)));
  float lumaMax = max(lumaCenter,max(max(lumaDown,lumaUp),max(lumaLeft,lumaRight)));

  // Compute the delta.
  float lumaRange = lumaMax - lumaMin;

  if(lumaRange < max(EDGE_THRESHOLD_MIN,lumaMax*EDGE_THRESHOLD_MAX)){
    gl_FragColor = vec4(colorCenter, 1.0);
    return;
  }

  // Query the 4 remaining corners lumas.
  float lumaDownLeft  = rgb2luma(texture2D(u_sampler,loc + invScreenSize * vec2(-1.0,-1.0)).rgb);
  float lumaUpRight   = rgb2luma(texture2D(u_sampler,loc + invScreenSize * vec2(1.0,1.0)).rgb);
  float lumaUpLeft    = rgb2luma(texture2D(u_sampler,loc + invScreenSize * vec2(-1.0,1.0)).rgb);
  float lumaDownRight = rgb2luma(texture2D(u_sampler,loc + invScreenSize * vec2(1.0,-1.0)).rgb);

  // Combine the four edges lumas (using intermediary variables for future computations with the same values).
  float lumaDownUp = lumaDown + lumaUp;
  float lumaLeftRight = lumaLeft + lumaRight;

  // Same for corners
  float lumaLeftCorners = lumaDownLeft + lumaUpLeft;
  float lumaDownCorners = lumaDownLeft + lumaDownRight;
  float lumaRightCorners = lumaDownRight + lumaUpRight;
  float lumaUpCorners = lumaUpRight + lumaUpLeft;

  // Compute an estimation of the gradient along the horizontal and vertical axis.
  float edgeHorizontal =  abs(-2.0 * lumaLeft + lumaLeftCorners)  + abs(-2.0 * lumaCenter + lumaDownUp ) * 2.0    + abs(-2.0 * lumaRight + lumaRightCorners);
  float edgeVertical =    abs(-2.0 * lumaUp + lumaUpCorners)      + abs(-2.0 * lumaCenter + lumaLeftRight) * 2.0  + abs(-2.0 * lumaDown + lumaDownCorners);

  // Is the local edge horizontal or vertical ?
  bool isHorizontal = (edgeHorizontal >= edgeVertical);

  // Select the two neighboring texels lumas in the opposite direction to the local edge.
  float luma1 = isHorizontal ? lumaDown : lumaLeft;
  float luma2 = isHorizontal ? lumaUp : lumaRight;
  // Compute gradients in this direction.
  float gradient1 = luma1 - lumaCenter;
  float gradient2 = luma2 - lumaCenter;

  // Which direction is the steepest ?
  bool is1Steepest = abs(gradient1) >= abs(gradient2);

  // Gradient in the corresponding direction, normalized.
  float gradientScaled = 0.25*max(abs(gradient1),abs(gradient2));

  // Choose the step size (one pixel) according to the edge direction.
  float stepLength = isHorizontal ? invScreenSize.y : invScreenSize.x;

  // Average luma in the correct direction.
  float lumaLocalAverage = 0.0;

  if(is1Steepest){
    // Switch the direction
    stepLength = - stepLength;
    lumaLocalAverage = 0.5*(luma1 + lumaCenter);
  } else {
    lumaLocalAverage = 0.5*(luma2 + lumaCenter);
  }

  // Shift UV in the correct direction by half a pixel.
  vec2 currentUv = loc;
  if(isHorizontal){
    currentUv.y += stepLength * 0.5;
  } else {
    currentUv.x += stepLength * 0.5;
  }

  // Compute offset (for each iteration step) in the right direction.
  vec2 offset = isHorizontal ? vec2(invScreenSize.x,0.0) : vec2(0.0,invScreenSize.y);
  // Compute UVs to explore on each side of the edge, orthogonally. The QUALITY allows us to step faster.
  vec2 uv1 = currentUv - offset;
  vec2 uv2 = currentUv + offset;

  // Read the lumas at both current extremities of the exploration segment, and compute the delta wrt to the local average luma.
  float lumaEnd1 = rgb2luma(texture2D(u_sampler,uv1).rgb);
  float lumaEnd2 = rgb2luma(texture2D(u_sampler,uv2).rgb);
  lumaEnd1 -= lumaLocalAverage;
  lumaEnd2 -= lumaLocalAverage;

  // If the luma deltas at the current extremities are larger than the local gradient, we have reached the side of the edge.
  bool reached1 = abs(lumaEnd1) >= gradientScaled;
  bool reached2 = abs(lumaEnd2) >= gradientScaled;
  bool reachedBoth = reached1 && reached2;

  // If the side is not reached, we continue to explore in this direction.
  if(!reached1){
    uv1 -= offset;
  }
  if(!reached2){
    uv2 += offset;
  }

  // If both sides have not been reached, continue to explore.
  if(!reachedBoth){

    for(int i = 2; i < ITERATIONS; i++){
      // If needed, read luma in 1st direction, compute delta.
      if(!reached1){
        lumaEnd1 = rgb2luma(texture2D(u_sampler, uv1).rgb);
        lumaEnd1 = lumaEnd1 - lumaLocalAverage;
      }
      // If needed, read luma in opposite direction, compute delta.
      if(!reached2){
        lumaEnd2 = rgb2luma(texture2D(u_sampler, uv2).rgb);
        lumaEnd2 = lumaEnd2 - lumaLocalAverage;
      }
      // If the luma deltas at the current extremities is larger than the local gradient, we have reached the side of the edge.
      reached1 = abs(lumaEnd1) >= gradientScaled;
      reached2 = abs(lumaEnd2) >= gradientScaled;
      reachedBoth = reached1 && reached2;

      // If the side is not reached, we continue to explore in this direction, with a variable quality.
      if(!reached1){
        uv1 -= offset * u_quality[i];
      }
      if(!reached2){
        uv2 += offset * u_quality[i];
      }

      // If both sides have been reached, stop the exploration.
      if(reachedBoth){ break;}
    }
  }

  // Compute the distances to each extremity of the edge.
  float distance1 = isHorizontal ? (loc.x - uv1.x) : (loc.y - uv1.y);
  float distance2 = isHorizontal ? (uv2.x - loc.x) : (uv2.y - loc.y);

  // In which direction is the extremity of the edge closer ?
  bool isDirection1 = distance1 < distance2;
  float distanceFinal = min(distance1, distance2);

  // Length of the edge.
  float edgeThickness = (distance1 + distance2);

  // UV offset: read in the direction of the closest side of the edge.
  float pixelOffset = - distanceFinal / edgeThickness + 0.5;

  // Is the luma at center smaller than the local average ?
  bool isLumaCenterSmaller = lumaCenter < lumaLocalAverage;

  // If the luma at center is smaller than at its neighbour, the delta luma at each end should be positive (same variation).
  // (in the direction of the closer side of the edge.)
  bool correctVariation = ((isDirection1 ? lumaEnd1 : lumaEnd2) < 0.0) != isLumaCenterSmaller;

  // If the luma variation is incorrect, do not offset.
  float finalOffset = correctVariation ? pixelOffset : 0.0;

  // Sub-pixel shifting
  // Full weighted average of the luma over the 3x3 neighborhood.
  float lumaAverage = (1.0/12.0) * (2.0 * (lumaDownUp + lumaLeftRight) + lumaLeftCorners + lumaRightCorners);
  // Ratio of the delta between the global average and the center luma, over the luma range in the 3x3 neighborhood.
  float subPixelOffset1 = clamp(abs(lumaAverage - lumaCenter)/lumaRange,0.0,1.0);
  float subPixelOffset2 = (-2.0 * subPixelOffset1 + 3.0) * subPixelOffset1 * subPixelOffset1;
  // Compute a sub-pixel offset based on this delta.
  float subPixelOffsetFinal = subPixelOffset2 * subPixelOffset2 * SUBPIXEL_QUALITY;

  // Pick the biggest of the two offsets.
  finalOffset = max(finalOffset,subPixelOffsetFinal);

  // Compute the final UV coordinates.
  vec2 finalUv = loc;
  if(isHorizontal){
    finalUv.y += finalOffset * stepLength;
  } else {
    finalUv.x += finalOffset * stepLength;
  }

  // Read the color at the new UV coordinates, and use it.
  vec3 finalColor = texture2D(u_sampler,finalUv).rgb;

  gl_FragColor = vec4(finalColor, 1.0);
}`;

export const waterAnimationFragmentShaderSource = `
precision mediump float;

varying highp vec2 v_texCoord;

uniform sampler2D u_sampler;

uniform float u_currentTime;

float rand(vec2 co){
  return fract(sin(dot(co.xy ,vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  float sinScale = 0.01;
  float cosScale = 0.005;
  float timeline = u_currentTime - 0.5;
  float noise = rand(v_texCoord) * 0.05;
  vec2 dudv = vec2(cos((v_texCoord.y + timeline + noise) / cosScale) * cosScale, sin((v_texCoord.x + timeline + noise) / sinScale) * sinScale);
  vec2 loc = v_texCoord + dudv;
  vec3 acc = texture2D(u_sampler, loc, 0.0).rgb; // accumulate center pixel

  gl_FragColor = vec4(acc, 1.0);
}`;

export const vertexPlanetShaderSource = `
precision mediump float;
// атрибут, который будет получать данные из буфера
// input from javascript
attribute vec3 a_position;
attribute vec3 a_tangent;

// output to fragment shader
varying vec3 v_normal;
varying vec3 v_worldPos;
varying vec3 v_planetColor;
varying float v_height;
varying vec3 v_pos;
varying vec3 v_tangent;

// const
uniform mat4 u_transform;
uniform mat4 u_projection;
uniform float u_waterLevel;
uniform float u_mountainHeight;

#common

float getHeight(vec3 pos) {
  float height = clamp((snoise(pos * 1.0) + 0.5 * snoise(pos * 2.0) + 0.25 * snoise(pos * 4.0)) / 1.75, u_waterLevel, 1.0);
  float heightAboveWater = max(height - u_waterLevel, 0.0);
  float normalizedHeightAboveWater = heightAboveWater / (1.0 - u_waterLevel);
  return normalizedHeightAboveWater;
}
// все шейдеры имеют функцию main
void main() {
  vec4 worldPos = (u_transform * vec4(a_position, 1.0));

  v_tangent = mat3(u_transform) * normalize(a_tangent); //vec3(-v_normal.y, v_normal.x, v_normal.z);
  v_normal = mat3(u_transform) * normalize(a_position).xyz;
 
  float height = getHeight(a_position);

  worldPos.xyz += normalize(worldPos.xyz) * height * u_mountainHeight;

  v_height = height;

  v_pos = a_position;

  // gl_Position - специальная переменная вершинного шейдера,
  // которая отвечает за установку положения
  v_worldPos = worldPos.xyz;
  vec4 transformedPosition = u_projection * worldPos;
  gl_Position = transformedPosition; // vec4(transformedPosition, 1.0);
}`;

export const planetFragmentShaderSource = `
precision mediump float;

// input from vertex shader
varying vec3 v_normal;
varying vec3 v_worldPos;
varying float v_height;
varying vec3 v_pos;
varying vec3 v_tangent;

// const per program
uniform sampler2D u_sampler;
uniform vec3 u_lightDir;
uniform vec3 u_snowColor;
uniform vec3 u_mountainsColor;
uniform vec3 u_earthColor;
uniform vec3 u_waterColor;
uniform float u_waterLevel;

uniform mat4 u_transform;

uniform vec3 u_eye;

#common

float getHeight_(vec3 pos) {
  return (snoise(pos * 1.0) + 0.5 * snoise(pos * 2.0) + 0.25 * snoise(pos * 4.0)) / 1.75;
}

float getHeight(vec3 pos) {
  float height = clamp((snoise(pos * 1.0) + 0.5 * snoise(pos * 2.0) + 0.25 * snoise(pos * 4.0)) / 1.75, u_waterLevel, 1.0);
  float heightAboveWater = max(height - u_waterLevel, 0.0);
  float normalizedHeightAboveWater = heightAboveWater / (1.0 - u_waterLevel);
  return normalizedHeightAboveWater;
}

void main() {
  vec3 L = normalize(u_lightDir);

  vec3 V = normalize(u_eye - v_worldPos);
  vec3 N = v_normal;

  float noise = (snoise(v_pos * 1.0) + 0.5 * snoise(v_pos * 2.0) + 0.25 * snoise(v_pos * 4.0)) / 1.75;
  float noise1 = snoise(v_pos * 1.0) * snoise(v_pos * 2.0);
  float noise3 = snoise(v_pos * 10.0);
  float noise2 = snoise(v_pos * 5.0);
  vec3 snowColor = u_snowColor;
  vec3 mountainColor = u_mountainsColor;
  vec3 earthColor = u_earthColor;
  vec3 waterColor = u_waterColor;
  // vec3 color = waterColor;

  float waterLevel = u_waterLevel;
  float snowLayer = 0.8 * (1.0 - abs(v_pos.y));
  float height = getHeight_(v_pos);

  float step = 0.04;
  vec3 tangent = v_tangent; //vec3(-v_normal.y, v_normal.x, v_normal.z);
  vec3 bitangent = normalize(cross(v_pos, tangent));
  float radius = length(v_pos);
  //tangent = cross(bitangent, v_pos);
  float tH = getHeight(normalize(v_pos - tangent * step ) * radius);
  float bH = getHeight(normalize(v_pos + tangent * step ) * radius);
  float lH = getHeight(normalize(v_pos - bitangent * step ) * radius);
  float rH = getHeight(normalize(v_pos + bitangent * step ) * radius);
  mat3 TBN = mat3(
    tangent,
    bitangent,
    v_normal
    );
  N = TBN * normalize(vec3(2.0 * ( rH - lH ), 2.0 * ( bH - tH ), -4.0));


  float heightAboveWater = max(height - waterLevel, 0.0);
  float normalizedHeightAboveWater = heightAboveWater / (1.0 - waterLevel) * noise2;

  const float borderThickness = 0.05;
  float border = smoothstep(u_waterLevel - borderThickness, u_waterLevel, height);
  float specPower = height > u_waterLevel + borderThickness ? 32.0 : 256.0;
  //float specPower = mix(256.0, 64.0, border);
  float specularStrength = mix(5.0, 0.1, border);
  vec3 color = mix(waterColor, earthColor, border);

  if (height > u_waterLevel) {
    float mountainIntensity = min(max(height - 0.6, 0.0) / 0.3, 1.0);
    color = mix(color, mountainColor, mountainIntensity);
  } else {
    color *= min(max(noise - 0.4, border) + 0.5, 1.0);
  }

  float noiseMoisture = (snoise(v_pos * 7.0)) * 0.5 + (snoise(v_pos * 1.0)) * 0.5;
  color += color * noiseMoisture * 0.5 * border;

  float snowNoise = ((snoise(v_pos * 70.0)) * 0.1 + (snoise(v_pos * 2.0)) * 0.9) * min(border + 0.2, 1.0);
  float snowIntensity = smoothstep(0.0, 0.5, max(abs(v_pos.y) - 0.2, 0.0)) * snowNoise;
  color = mix(color, snowColor, snowIntensity);

  vec3 R = normalize(reflect(L, N));
  float NoL = max(dot(N, -L), 0.0);

  vec3 lightColor = vec3(1.0, 1.0, 0.5) * 0.7;
  vec3 diffuse = NoL * color;
  vec3 specular = specularStrength * pow(max(dot(R, V), 0.0), specPower) * lightColor;
  vec3 ambient = color * vec3(4.0 / 255.0, 5.0 / 255.0, 45.0 / 255.0) * 1.5;
  vec3 resultLighting = diffuse + specular + ambient;
  gl_FragColor = vec4(resultLighting, 1.0);
}`;

export const cloudsVertexShaderSource = `
precision mediump float;
// атрибут, который будет получать данные из буфера
// input from javascript
attribute vec3 a_position;
attribute vec3 a_tangent;


// output to fragment shader
varying vec3 v_normal;
varying vec3 v_worldPos;
varying vec3 v_pos;
varying vec3 v_tangent;

// const
uniform mat4 u_transform;
uniform mat4 u_projection;
uniform mediump float u_time;

#common

void main() {
  vec4 worldPos = (u_transform * vec4(a_position, 1.0));
  v_normal = normalize(worldPos.xyz); // normalize(mat3(u_transform) * a_normal);

  v_pos = a_position;
  // gl_Position - специальная переменная вершинного шейдера,
  // которая отвечает за установку положения

  float height = cloudsIntensity(v_pos, u_time);

  v_tangent = a_tangent;

  worldPos.xyz += v_normal * height * 0.015;
  v_worldPos = worldPos.xyz;
  vec4 transformedPosition = u_projection * worldPos;
  gl_Position = transformedPosition; // vec4(transformedPosition, 1.0);
}`;

export const cloudsFragmentShaderSource = `
precision mediump float;
// input from vertex shader
varying vec3 v_normal;
varying vec3 v_worldPos;
varying vec3 v_pos;
varying vec3 v_tangent;

// const per program
uniform sampler2D u_sampler;
uniform vec3 u_lightDir;
uniform float u_time;
uniform mat4 u_transform;

uniform vec3 u_eye;

#common

void main() {
  vec3 L = normalize(u_lightDir);

  vec3 V = normalize(u_eye - v_worldPos);
  vec3 N = v_normal;

  vec3 R = reflect(L, N);
  //float specPower = pow(max(dot(R, V), 0.0), v_height >= 0.0 ? 8.0 : 24.0);

  float noise = cloudsIntensity(v_pos, u_time);

  float step = 0.04;
  vec3 tangent = v_tangent; //vec3(-v_normal.y, v_normal.x, v_normal.z);
  vec3 bitangent = normalize(cross(v_pos, tangent));
  float radius = length(v_pos);
  //tangent = cross(bitangent, v_pos);
  float tH = cloudsIntensity(normalize(v_pos - tangent * step ) * radius, u_time);
  float bH = cloudsIntensity(normalize(v_pos + tangent * step ) * radius, u_time);
  float lH = cloudsIntensity(normalize(v_pos - bitangent * step ) * radius, u_time);
  float rH = cloudsIntensity(normalize(v_pos + bitangent * step ) * radius, u_time);
  //N = normalize(mat3(u_transform) * normalize(vec3(2.0 * ( rH - lH ), 2.0 * ( bH - tH ), 4.0)));
  mat3 TBN = mat3(
    tangent,
    bitangent,
    v_normal
    );
  N = TBN * normalize(vec3(2.0 * ( rH - lH ), 2.0 * ( bH - tH ), -4.0));

  float NoV = abs(dot(v_normal, V));
  if (NoV < 0.3) {
    noise = 0.0;
  }

  float specPower = 2.0;
  float specularStrength = 0.6;

  float NoL = max(dot(N, -L), 0.0); // max(dot(v_normal, -L), 0.0);
  vec3 lightColor = vec3(1.0, 1.0, 0.5) * 0.7;
  vec3 color = vec3(1.0, 1.0, 1.0) * noise;
  vec3 diffuse = NoL * color;
  vec3 specular = specularStrength * pow(max(dot(R, V), 0.0), specPower) * lightColor;
  vec3 ambient = color * 0.3;
  vec3 resultLighting = diffuse + specular + ambient;
  gl_FragColor = vec4(resultLighting, noise);
}`;