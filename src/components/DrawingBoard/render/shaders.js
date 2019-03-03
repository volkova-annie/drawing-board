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