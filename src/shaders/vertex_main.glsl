vec3 coords=normal;
float slowTime = time * 0.05;
coords.y+=slowTime;
vec3 noisePattern=vec3(cnoise(coords / 1.5));
float pattern=wave(noisePattern + slowTime);

vDisplacement=pattern;

float displacement=vDisplacement/3.;

transformed += normalize(objectNormal) * displacement;