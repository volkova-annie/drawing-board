export const vertexShaderSource = `
  // атрибут, который будет получать данные из буфера
  attribute vec3 a_position;
  attribute vec2 a_texCoord;
  
  varying highp vec2 v_texCoord;
  
  uniform bool u_flipY;
  uniform mat3 u_transform;
  uniform vec2 u_resolution;
  
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
    acc = texture2D(u_sampler, loc); // accumulate center pixel
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
    vec3 acc = texture2D(u_sampler, loc).rgb; // accumulate center pixel
    float bw = (acc.r + acc.g + acc.b) / 3.0; // берем сумму всех каналов и нормализуем его, чтобы значение было от 0 до 1
    
    gl_FragColor = vec4(vec3(bw), 1.0);
  }`;

export const defaultFragmentShaderSource = `
  precision mediump float;
 
  varying highp vec2 v_texCoord;

  uniform sampler2D u_sampler;

  void main() {
    vec2 loc = v_texCoord; // center pixel cooordinate
    vec3 acc = texture2D(u_sampler, loc).rgb; // accumulate center pixel
    
    gl_FragColor = vec4(acc, 1.0);
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
    vec3 acc = texture2D(u_sampler, loc).rgb; // accumulate center pixel
    
    gl_FragColor = vec4(acc, 1.0);
  }`;

export const vertexPlanetShaderSource = `
  // атрибут, который будет получать данные из буфера
  // input from javascript
  attribute vec3 a_position; 
  attribute vec3 a_color;
  attribute vec2 a_texCoord;
  attribute vec3 a_normal;
  
  // output to fragment shader
  varying highp vec3 v_color;
  varying highp vec2 v_texCoord;
  varying vec3 v_normal;
  varying vec3 v_worldPos;
  varying vec3 v_planetColor;
  varying float v_height;
  varying vec3 v_pos;
  
  // const
  uniform mat4 u_transform;
  uniform mat4 u_projection;
  
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
  
  // все шейдеры имеют функцию main
  void main() {
    vec4 worldPos = (u_transform * vec4(a_position, 1.0));
    
    // mat4 invMVP = transpose(inverse(u_transform));
    v_normal = normalize(mat3(u_transform) * a_normal);
    v_color = a_color;
    
    float noise = (snoise(a_position * 1.0) + 0.5 * snoise(a_position * 2.0) + 0.25 * snoise(a_position * 4.0)) / 1.75;
    
    float waterLevel = 0.55;
    float height = noise;
    float heightAboveWater = max(height - waterLevel, 0.0);
    float normalizedHeightAboveWater = heightAboveWater / (1.0 - waterLevel);
    if (heightAboveWater > 0.0) {
      float maxHeight = 0.02;
      worldPos.xyz += v_normal * normalizedHeightAboveWater * maxHeight;
    }
    
    v_texCoord = a_texCoord;
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
  varying highp vec3 v_color;
  varying highp vec2 v_texCoord;
  varying vec3 v_normal;
  varying vec3 v_worldPos;
  varying float v_height;
  varying vec3 v_pos;

  // const per program
  uniform sampler2D u_sampler;
  uniform vec3 u_lightDir;
  uniform vec3 u_snowColor;
  uniform vec3 u_mountainsColor;
  uniform vec3 u_earthColor;
  uniform vec3 u_waterColor;

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

  void main() {
     //vec2 loc = v_texCoord; // center pixel cooordinate
     //vec3 acc = texture2D(u_sampler, loc).rgb; // accumulate center pixel
    
    vec3 L = -normalize(u_lightDir);
    
    vec3 camPos = vec3(0.0, 0.0, 0.0);
    vec3 V = normalize(v_worldPos - camPos);
    vec3 N = v_normal;
    
    vec3 R = reflect(-L, N);
    //float specPower = pow(max(dot(R, V), 0.0), v_height >= 0.0 ? 8.0 : 24.0);
    
    float noise = (snoise(v_pos * 1.0) + 0.5 * snoise(v_pos * 2.0) + 0.25 * snoise(v_pos * 4.0)) / 1.75;
    float noise1 = snoise(v_pos * 1.0) * snoise(v_pos * 2.0);
    float noise3 = snoise(v_pos * 10.0);
    float noise2 = snoise(v_pos * 5.0);
    vec3 snowColor = u_snowColor;
    vec3 mountainColor = u_mountainsColor;
    vec3 earthColor = u_earthColor;
    vec3 waterColor = u_waterColor;
    vec3 color = waterColor;

    float waterLevel = 0.3;
    float snowLayer = 0.8 * (1.0 - abs(v_pos.y));
    float height = noise1;
    float heightAboveWater = max(height - waterLevel, 0.0);
    float normalizedHeightAboveWater = heightAboveWater / (1.0 - waterLevel) * noise2;

    color = mix(waterColor, earthColor, min(max((height - 0.1) / waterLevel, 0.0) * pow(noise3, 30.0), 1.0));
    if (heightAboveWater > 0.0) {
      color = mix(earthColor, mountainColor, normalizedHeightAboveWater);//1.0 + 1.0 / -exp(normalizedHeightAboveWater * 6.0));
      color = mix(color, snowColor, min(abs(v_pos.y) - 0.5 + max(normalizedHeightAboveWater - snowLayer, 0.0) / (1.0 - snowLayer), 1.0));
    }

    float specPower = 8.0;
    float specularStrength = 0.6; 
    color = waterColor;
    if (v_height > 0.55) { // todo: uniform flot waterLevel 
      color = earthColor;
      float noiseMoisture = (snoise(v_pos * 4.0)) / 1.0;

      float mountainIntensity = min(max(v_height - 0.6, 0.0) / 0.3, 1.0);
      color = mix(earthColor, mountainColor, pow(mountainIntensity, 0.5));
      float snowIntensity = max(abs(v_pos.y) - 0.5, 0.0);
      color = mix(color, snowColor, snowIntensity);
      color += color * noiseMoisture * 0.5;
    } else {
      specPower = 64.0;
      specularStrength = 2.0;
      color *= min(max(noise - 0.4, 0.0) + 0.5, 1.0);
    }

    //float noise = min(snoise(v_pos * 1.0) + 0.5 * snoise(v_pos * 2.0) + 0.25 * snoise(v_pos * 4.0), 1.0);
    //color = vec3(noise);
    //color = vec3(v_height);

 
    float NoL = max(dot(v_normal, -L), 0.0);
    
    vec3 lightColor = vec3(1.0, 1.0, 0.5) * 0.7;
    vec3 diffuse = NoL * color;
    vec3 specular = specularStrength * pow(max(dot(R, V), 0.0), specPower) * lightColor;
    vec3 ambient = color * 0.3;
    vec3 resultLighting = diffuse + specular + ambient;
    gl_FragColor = vec4(resultLighting, 1.0);
    //gl_FragColor = vec4(v_texCoord, 0.0, 1.0);
    //gl_FragColor = vec4(v_planetColor, 1.0);
  }`;