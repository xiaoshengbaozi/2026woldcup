export const EARTH_VS = `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const EARTH_FS = `
  uniform vec3 uGlobeColor;
  uniform vec3 uLightDir;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 V = normalize(cameraPosition - vWorldPos);
    float NdotV = max(dot(V, vNormal), 0.0);
    float fresnel = smoothstep(0.0, 0.65, 1.0 - NdotV) * 0.22;
    float diff = max(dot(vNormal, uLightDir), 0.0);
    vec3 c = uGlobeColor * (0.38 + diff * 0.35) + vec3(1.0) * fresnel;
    gl_FragColor = vec4(c, 1.0);
  }
`;

export const INNER_GLOW_VS = `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const INNER_GLOW_FS = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 V = normalize(cameraPosition - vWorldPos);
    float NdotV = max(dot(V, vNormal), 0.0);
    float glow = pow(1.0 - NdotV, uPower) * uIntensity;
    gl_FragColor = vec4(uColor, glow);
  }
`;

export const OUTER_GLOW_FS = `
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 V = normalize(cameraPosition - vWorldPos);
    float NdotV = max(dot(V, vNormal), 0.0);
    float glow = pow(1.0 - NdotV, 2.2) * 0.12;
    gl_FragColor = vec4(uColor, glow);
  }
`;

export const DOT_VS = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  attribute float aDepth;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vDepth;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vDepth = aDepth;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (320.0 / -mv.z) * (0.55 + aDepth * 0.45);
    gl_Position = projectionMatrix * mv;
  }
`;

export const DOT_FS = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vDepth;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;
    float core  = exp(-12.0 * d * d);
    float halo  = exp(-4.0  * d * d) * 0.25;
    float shape = core + halo;
    shape *= smoothstep(0.5, 0.2, d);
    float brightness = 1.0 + vDepth * 0.2;
    vec3 c = vColor * brightness;
    gl_FragColor = vec4(c, vAlpha * shape);
  }
`;
