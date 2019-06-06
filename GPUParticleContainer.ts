import GPUParticleSystem from './GPUParticleSystem';
import * as THREE from 'three';
import { BufferAttribute } from 'three';

export default class GPUParticleContainer extends THREE.Object3D {
    public PARTICLE_COUNT: number;
    public PARTICLE_CURSOR: number;
    public time: number;
    public offset: number;
    public count: number;
    public DPR: number;
    public GPUParticleSystem: GPUParticleSystem;
    public particleUpdate: boolean;
    public particleShaderMat: THREE.ShaderMaterial;
    public particleShaderGeo: THREE.BufferGeometry;
    public particleSystem: THREE.Points;
    constructor(maxParticles: number, particleSystem: GPUParticleSystem) {
        super();
        this.PARTICLE_COUNT = maxParticles || 100000;
        this.PARTICLE_CURSOR = 0;
        this.time = 0;
        this.offset = 0;
        this.count = 0;
        this.DPR = window.devicePixelRatio;
        this.GPUParticleSystem = particleSystem;
        this.particleUpdate = false;

        // geometry

        this.particleShaderGeo = new THREE.BufferGeometry();

        // tslint:disable-next-line:max-line-length
        this.particleShaderGeo.addAttribute('position', new THREE.BufferAttribute(new Float32Array(this.PARTICLE_COUNT * 3), 3).setDynamic(true));
        // tslint:disable-next-line:max-line-length
        this.particleShaderGeo.addAttribute('positionStart', new THREE.BufferAttribute(new Float32Array(this.PARTICLE_COUNT * 3), 3).setDynamic(true));
        // tslint:disable-next-line:max-line-length
        this.particleShaderGeo.addAttribute('startTime', new THREE.BufferAttribute(new Float32Array(this.PARTICLE_COUNT), 1).setDynamic(true));
        // tslint:disable-next-line:max-line-length
        this.particleShaderGeo.addAttribute('velocity', new THREE.BufferAttribute(new Float32Array(this.PARTICLE_COUNT * 3), 3).setDynamic(true));
        // tslint:disable-next-line:max-line-length
        this.particleShaderGeo.addAttribute('turbulence', new THREE.BufferAttribute(new Float32Array(this.PARTICLE_COUNT), 1).setDynamic(true));
        // tslint:disable-next-line:max-line-length
        this.particleShaderGeo.addAttribute('color', new THREE.BufferAttribute(new Float32Array(this.PARTICLE_COUNT * 3), 3).setDynamic(true));
        // tslint:disable-next-line:max-line-length
        this.particleShaderGeo.addAttribute('size', new THREE.BufferAttribute(new Float32Array(this.PARTICLE_COUNT), 1).setDynamic(true));
        // tslint:disable-next-line:max-line-length
        this.particleShaderGeo.addAttribute('lifeTime', new THREE.BufferAttribute(new Float32Array(this.PARTICLE_COUNT), 1).setDynamic(true));

        // material

        this.particleShaderMat = this.GPUParticleSystem.particleShaderMat;
        this.init();
    }

    public spawnParticle(options: {
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        color: THREE.Color,
        positionRandomness: number,
        velocityRandomness: number,
        colorRandomness: number,
        turbulence: number,
        lifetime: number,
        size: number,
        sizeRandomness: number,
        smoothPosition: boolean
    }) {
        let position = new THREE.Vector3();
        let velocity = new THREE.Vector3();
        let color = new THREE.Color();
        // console.log('particle container spawn particle');
        const positionStartAttribute = this.particleShaderGeo.getAttribute('positionStart') as THREE.InterleavedBufferAttribute;
        const startTimeAttribute = this.particleShaderGeo.getAttribute('startTime') as THREE.InterleavedBufferAttribute;
        const velocityAttribute = this.particleShaderGeo.getAttribute('velocity') as THREE.InterleavedBufferAttribute;
        const turbulenceAttribute = this.particleShaderGeo.getAttribute('turbulence') as THREE.InterleavedBufferAttribute;
        const colorAttribute = this.particleShaderGeo.getAttribute('color') as THREE.InterleavedBufferAttribute;
        const sizeAttribute = this.particleShaderGeo.getAttribute('size') as THREE.InterleavedBufferAttribute;
        const lifeTimeAttribute = this.particleShaderGeo.getAttribute('lifeTime') as THREE.InterleavedBufferAttribute;
        // console.log(positionStartAttribute);
        // let options = options || {};

        // setup reasonable default values for all arguments

        position = options.position !== undefined ? position.copy(options.position) : position.set(0, 0, 0);
        velocity = options.velocity !== undefined ? velocity.copy(options.velocity) : velocity.set(0, 0, 0);
        color = options.color !== undefined ? color.set(options.color) : color.set(0xffffff);

        const positionRandomness = options.positionRandomness !== undefined ? options.positionRandomness : 0;
        const velocityRandomness = options.velocityRandomness !== undefined ? options.velocityRandomness : 0;
        const colorRandomness = options.colorRandomness !== undefined ? options.colorRandomness : 1;
        const turbulence = options.turbulence !== undefined ? options.turbulence : 1;
        const lifetime = options.lifetime !== undefined ? options.lifetime : 5;
        let size = options.size !== undefined ? options.size : 10;
        const sizeRandomness = options.sizeRandomness !== undefined ? options.sizeRandomness : 0;
        const smoothPosition = options.smoothPosition !== undefined ? options.smoothPosition : false;

        if (this.DPR !== undefined) size *= this.DPR;

        const i = this.PARTICLE_CURSOR;

        // position
        positionStartAttribute.array[i * 3 + 0] = position.x + (this.GPUParticleSystem.random() * positionRandomness);
        positionStartAttribute.array[i * 3 + 1] = position.y + (this.GPUParticleSystem.random() * positionRandomness);
        positionStartAttribute.array[i * 3 + 2] = position.z + (this.GPUParticleSystem.random() * positionRandomness);

        if (smoothPosition === true) {

            positionStartAttribute.array[i * 3 + 0] += - (velocity.x * this.GPUParticleSystem.random());
            positionStartAttribute.array[i * 3 + 1] += - (velocity.y * this.GPUParticleSystem.random());
            positionStartAttribute.array[i * 3 + 2] += - (velocity.z * this.GPUParticleSystem.random());

        }

        // velocity

        const maxVel = 2;
        let velX = velocity.x + this.GPUParticleSystem.random() * velocityRandomness;
        let velY = velocity.y + this.GPUParticleSystem.random() * velocityRandomness;
        let velZ = velocity.z + this.GPUParticleSystem.random() * velocityRandomness;

        velX = THREE.Math.clamp((velX - (- maxVel)) / (maxVel - (- maxVel)), 0, 1);
        velY = THREE.Math.clamp((velY - (- maxVel)) / (maxVel - (- maxVel)), 0, 1);
        velZ = THREE.Math.clamp((velZ - (- maxVel)) / (maxVel - (- maxVel)), 0, 1);

        velocityAttribute.array[i * 3 + 0] = velX;
        velocityAttribute.array[i * 3 + 1] = velY;
        velocityAttribute.array[i * 3 + 2] = velZ;

        // color

        color.r = THREE.Math.clamp(color.r + this.GPUParticleSystem.random() * colorRandomness, 0, 1);
        color.g = THREE.Math.clamp(color.g + this.GPUParticleSystem.random() * colorRandomness, 0, 1);
        color.b = THREE.Math.clamp(color.b + this.GPUParticleSystem.random() * colorRandomness, 0, 1);

        colorAttribute.array[i * 3 + 0] = color.r;
        colorAttribute.array[i * 3 + 1] = color.g;
        colorAttribute.array[i * 3 + 2] = color.b;

        // turbulence, size, lifetime and starttime

        turbulenceAttribute.array[i] = turbulence;
        sizeAttribute.array[i] = size + this.GPUParticleSystem.random() * sizeRandomness;
        lifeTimeAttribute.array[i] = lifetime;
        startTimeAttribute.array[i] = this.time + this.GPUParticleSystem.random() * 2e-2;

        // offset

        if (this.offset === 0) {

            this.offset = this.PARTICLE_CURSOR;

        }

        // counter and cursor

        this.count++;
        this.PARTICLE_CURSOR++;

        if (this.PARTICLE_CURSOR >= this.PARTICLE_COUNT) {

            this.PARTICLE_CURSOR = 0;

        }

        this.particleUpdate = true;
    }


    public init() {

        this.particleSystem = new THREE.Points(this.particleShaderGeo, this.particleShaderMat);
        this.particleSystem.frustumCulled = false;
        this.add(this.particleSystem);

    }

    public update(time: number) {

        this.time = time;
        this.particleShaderMat.uniforms.uTime.value = time;
        this.geometryUpdate();

    }

    public geometryUpdate() {

        if (this.particleUpdate === true) {

            this.particleUpdate = false;

            const positionStartAttribute = this.particleShaderGeo.getAttribute('positionStart');
            const startTimeAttribute = this.particleShaderGeo.getAttribute('startTime');
            const velocityAttribute = this.particleShaderGeo.getAttribute('velocity');
            const turbulenceAttribute = this.particleShaderGeo.getAttribute('turbulence');
            const colorAttribute = this.particleShaderGeo.getAttribute('color');
            const sizeAttribute = this.particleShaderGeo.getAttribute('size');
            const lifeTimeAttribute = this.particleShaderGeo.getAttribute('lifeTime');

            if (this.offset + this.count < this.PARTICLE_COUNT) {

                (positionStartAttribute as BufferAttribute).updateRange.offset = this.offset * positionStartAttribute.itemSize;
                (startTimeAttribute as BufferAttribute).updateRange.offset = this.offset * startTimeAttribute.itemSize;
                (velocityAttribute as BufferAttribute).updateRange.offset = this.offset * velocityAttribute.itemSize;
                (turbulenceAttribute as BufferAttribute).updateRange.offset = this.offset * turbulenceAttribute.itemSize;
                (colorAttribute as BufferAttribute).updateRange.offset = this.offset * colorAttribute.itemSize;
                (sizeAttribute as BufferAttribute).updateRange.offset = this.offset * sizeAttribute.itemSize;
                (lifeTimeAttribute as BufferAttribute).updateRange.offset = this.offset * lifeTimeAttribute.itemSize;

                (positionStartAttribute as BufferAttribute).updateRange.count = this.count * positionStartAttribute.itemSize;
                (startTimeAttribute as BufferAttribute).updateRange.count = this.count * startTimeAttribute.itemSize;
                (velocityAttribute as BufferAttribute).updateRange.count = this.count * velocityAttribute.itemSize;
                (turbulenceAttribute as BufferAttribute).updateRange.count = this.count * turbulenceAttribute.itemSize;
                (colorAttribute as BufferAttribute).updateRange.count = this.count * colorAttribute.itemSize;
                (sizeAttribute as BufferAttribute).updateRange.count = this.count * sizeAttribute.itemSize;
                (lifeTimeAttribute as BufferAttribute).updateRange.count = this.count * lifeTimeAttribute.itemSize;

            } else {

                (positionStartAttribute as BufferAttribute).updateRange.offset = 0;
                (startTimeAttribute as BufferAttribute).updateRange.offset = 0;
                (velocityAttribute as BufferAttribute).updateRange.offset = 0;
                (turbulenceAttribute as BufferAttribute).updateRange.offset = 0;
                (colorAttribute as BufferAttribute).updateRange.offset = 0;
                (sizeAttribute as BufferAttribute).updateRange.offset = 0;
                (lifeTimeAttribute as BufferAttribute).updateRange.offset = 0;

                // Use -1 to update the entire buffer, see #11476
                (positionStartAttribute as BufferAttribute).updateRange.count = - 1;
                (startTimeAttribute as BufferAttribute).updateRange.count = - 1;
                (velocityAttribute as BufferAttribute).updateRange.count = - 1;
                (turbulenceAttribute as BufferAttribute).updateRange.count = - 1;
                (colorAttribute as BufferAttribute).updateRange.count = - 1;
                (sizeAttribute as BufferAttribute).updateRange.count = - 1;
                (lifeTimeAttribute as BufferAttribute).updateRange.count = - 1;

            }

            (positionStartAttribute as BufferAttribute).needsUpdate = true;
            (startTimeAttribute as BufferAttribute).needsUpdate = true;
            (velocityAttribute as BufferAttribute).needsUpdate = true;
            (turbulenceAttribute as BufferAttribute).needsUpdate = true;
            (colorAttribute as BufferAttribute).needsUpdate = true;
            (sizeAttribute as BufferAttribute).needsUpdate = true;
            (lifeTimeAttribute as BufferAttribute).needsUpdate = true;

            this.offset = 0;
            this.count = 0;

        }

    }

    public dispose() {
        this.particleShaderGeo.dispose();
    }


}

