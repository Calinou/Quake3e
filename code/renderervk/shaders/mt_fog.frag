#version 450

layout(set = 0, binding = 0) uniform UBO {
	// VERTEX
	vec4 eyePos;
	vec4 lightPos;
	//  VERTEX-FOG
	vec4 fogDistanceVector;
	vec4 fogDepthVector;
	vec4 fogEyeT;
	// FRAGMENT
	vec4 lightColor;
	vec4 fogColor;
	// linear dynamic light
	vec4 lightVector;
};
layout(set = 1, binding = 0) uniform sampler2D texture0;
layout(set = 2, binding = 0) uniform sampler2D texture1;
layout(set = 3, binding = 0) uniform sampler2D texture2; // fog texture

layout(location = 0) in vec4 frag_color;
layout(location = 1) centroid in vec2 frag_tex_coord0;
layout(location = 2) centroid in vec2 frag_tex_coord1;
layout(location = 3) centroid in vec2 fog_tex_coord; // fog txcoords
//layout (constant_id = 4) const int color_mode = 0;
//layout (constant_id = 5) const int abs_light = 0;
layout (constant_id = 6) const int tex_mode = 0; // modulate, add, add2

layout(location = 0) out vec4 out_color;

layout (constant_id = 0) const int alpha_test_func = 0;
layout (constant_id = 1) const float alpha_test_value = 0.0;
//layout (constant_id = 2) const float depth_fragment = 0.85;
layout (constant_id = 3) const int alpha_to_coverage = 0;

float CorrectAlpha(float threshold, float alpha, vec2 tc)
{
	ivec2 ts = textureSize(texture0, 0);
	float dx = max(abs(dFdx(tc.x * float(ts.x))), 0.001);
	float dy = max(abs(dFdy(tc.y * float(ts.y))), 0.001);
	float dxy = max(dx, dy); // apply the smallest boost
	float scale = max(1.0 / dxy, 1.0);
	float ac = threshold + (alpha - threshold) * scale;
	return ac;
}

void main() {
	vec4 base;
	vec4 fog = texture(texture2, fog_tex_coord);
	vec4 color_a = frag_color * texture(texture0, frag_tex_coord0);
	vec4 color_b = texture(texture1, frag_tex_coord1);

	if ( tex_mode == 1 ) { // add
		base = vec4(color_a.rgb + color_b.rgb, color_a.a * color_b.a);
	} else if ( tex_mode == 2 )	{ // add2
		color_b *= frag_color;
		base = vec4(color_a.rgb + color_b.rgb, color_a.a * color_b.a);
	}else { // modulate
		base = color_a * color_b;
	}

	if (alpha_to_coverage != 0) {
		if (alpha_test_func == 1) {
			base.a = CorrectAlpha(alpha_test_value, base.a, frag_tex_coord0);
		} else if (alpha_test_func == 2) {
			base.a = CorrectAlpha(alpha_test_value, 1.0 - base.a, frag_tex_coord0);
		} else if (alpha_test_func == 3) {
			base.a = CorrectAlpha(alpha_test_value, base.a, frag_tex_coord0);
		}
	} else
	// specialization: alpha-test function
	if (alpha_test_func == 1) {
		if (base.a == alpha_test_value) discard;
	} else if (alpha_test_func == 2) {
		if (base.a >= alpha_test_value) discard;
	} else if (alpha_test_func == 3) {
		if (base.a < alpha_test_value) discard;
	}

	fog = fog * fogColor;

	out_color = mix( base, fog, fog.a );
}
