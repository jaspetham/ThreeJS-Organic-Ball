import * as THREE from "three";
import { REVISION } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GlitchPass } from "three/examples/jsm/postprocessing/GlitchPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import vertexShaderPars from "./shaders/vertex_parse.glsl"
import vertexShaderMain from "./shaders/vertex_main.glsl"
import fragmentShaderParse from "./shaders/fragment_parse.glsl"
import fragmentShaderMain from "./shaders/fragment_main.glsl"
import * as dat from "lil-gui";
// import gsap from 'gsap';

export default class Sketch {
  constructor(options) {
    this.scene = new THREE.Scene();

    this.container = options.dom;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.001,
      1000
    );

    // var frustumSize = 10;
    // var aspect = window.innerWidth / window.innerHeight;
    // this.camera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, -1000, 1000 );
    this.camera.position.set(0, 0, 2);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.time = new THREE.Clock();
    this.elapsedTime = 0;
    this.previousTime = 0;

    const THREE_PATH = `https://unpkg.com/three@0.${REVISION}.x`
    this.dracoLoader =  new DRACOLoader(new THREE.LoadingManager()).setDecoderPath(`${THREE_PATH}/examples/jsm/libs/draco/gltf/`);
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    this.isPlaying = true;

    this.settingsOption = {
        exposure:1,
        threshold: 0,
        strength: 3,
        radius: 0,
    };

    this.addObjects();
    this.addLights();
    this.addPostProcessing();
    this.resize();
    this.render();
    this.setupResize();
    this.settings();
  }

  settings() {
    this.gui = new dat.GUI();
    this.gui.add(this.settingsOption, "exposure", 0, 1, 0.01).onChange((value) => {
        this.renderer.toneMappingExposure = Math.pow(value, 4.0);
    });
    this.gui.add(this.settingsOption, "strength", 0, 5, 0.01).onChange((value) => {
        this.bloomPass.strength = Number(value, 4.0);
    });
    this.gui.add(this.settingsOption, "radius", -5, 5, 0.01).onChange((value) => {
        this.bloomPass.radius = Number(value, 4.0);
    });
  }

  setupResize() {
    window.addEventListener("resize", this.resize.bind(this));
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;

    // image cover
    this.imageAspect = 1;
    let a1;
    let a2;
    if (this.height / this.width > this.imageAspect) {
      a1 = (this.width / this.height) * this.imageAspect;
      a2 = 1;
    } else {
      a1 = 1;
      a2 = this.height / this.width / this.imageAspect;
    }

    // this.material.uniforms.resolution.value.x = this.width;
    // this.material.uniforms.resolution.value.y = this.height;
    // this.material.uniforms.resolution.value.z = a1;
    // this.material.uniforms.resolution.value.w = a2;

    this.camera.updateProjectionMatrix();
  }

  addLights(){
    const light1 = new THREE.AmbientLight(0x4255ff, 0.5);
    this.scene.add(light1);

    const light2 = new THREE.DirectionalLight(0x526cff, 0.6);
    light2.position.set(2,2,2);
    this.scene.add(light2);
  }

  addPostProcessing(){
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene,this.camera);
    this.composer.setSize(this.width,this.height);
    this.composer.addPass(this.renderPass);
    // const glitchPass = new GlitchPass();
    // this.composer.addPass(glitchPass);
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      this.settingsOption.bloomStrength,
      this.settingsOption.bloomRadius,
      this.settingsOption.bloomThreshold
    );
    this.bloomPass.renderToScreen = true;
    this.composer.addPass(this.bloomPass);
  }

  addObjects() {
    this.material = new THREE.MeshStandardMaterial({
      onBeforeCompile: (shader) => {
        // storing a reference to shader object
        this.material.userData.shader = shader;
        // uniforms
        shader.uniforms.time = { value:0 }
        const parseVertexString = /*glsl*/`#include <displacementmap_pars_vertex>`
        shader.vertexShader = shader.vertexShader.replace(
            parseVertexString,
            parseVertexString + "\n" + vertexShaderPars);
        const mainVertexString = /*glsl*/ `#include <displacementmap_vertex>`
         shader.vertexShader = shader.vertexShader.replace(
           mainVertexString,
           mainVertexString + "\n" + vertexShaderMain
         );
         const mainFragmentString = /*glsl*/`#include <normal_fragment_maps>`;
         const parseFragmentString = /*glsl*/`#include <bumpmap_pars_fragment>`;
         shader.fragmentShader = shader.fragmentShader.replace(
            mainFragmentString,
            mainFragmentString + "\n" + fragmentShaderMain)
         shader.fragmentShader = shader.fragmentShader.replace(
            parseFragmentString,
            parseFragmentString + "\n" + fragmentShaderParse)
      }
    });

    this.geometry = new THREE.IcosahedronGeometry(1, 400);
    this.plane = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.plane);
  }

  stop() {
    this.isPlaying = false;
  }

  play() {
    if (!this.isPlaying) {
      this.render();
      this.isPlaying = true;
    }
  }

  render() {
    if (!this.isPlaying) return;
    this.elapsedTime = this.time.getElapsedTime();
    // const deltaTime = this.elapsedTime - this.previousTime
    // this.previousTime = this.elapsedTime
    if (!!this.material.userData.shader){
        this.material.userData.shader.uniforms.time.value = this.elapsedTime;
    }
    requestAnimationFrame(this.render.bind(this));
    this.composer.render(this.scene, this.camera);
  }
}

new Sketch({
  dom: document.getElementById("container"),
});
