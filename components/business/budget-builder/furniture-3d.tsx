'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { FurnitureDimensions, FurnitureShape } from '@/lib/budget-builder/types';
import { buildParts, type PartKind } from '@/helpers/budget-builder/geometry';
import { finishColor } from '@/helpers/budget-builder/calculate';

interface Furniture3DProps {
	shape: FurnitureShape;
	dimensions: FurnitureDimensions;
	finish: string;
	className?: string;
}

const CM = 0.01;
const EDGE_COLOR = 0x1d1d1b;
const BACK_TINT = 0.12;

/** Lighter back panels read as "fondo" without needing a label. */
function colorFor(kind: PartKind, base: THREE.Color): THREE.Color {
	return kind === 'back' ? base.clone().lerp(new THREE.Color(0xffffff), BACK_TINT) : base;
}

function buildFurniture(shape: FurnitureShape, dimensions: FurnitureDimensions, finish: string) {
	const group = new THREE.Group();
	const base = new THREE.Color(finishColor(finish));
	const edgeMaterial = new THREE.LineBasicMaterial({
		color: EDGE_COLOR,
		transparent: true,
		opacity: 0.45,
	});

	for (const part of buildParts(shape, dimensions)) {
		const [w, h, d] = part.size.map((value) => Math.max(value, 0.1) * CM);
		const geometry = new THREE.BoxGeometry(w, h, d);
		const material = new THREE.MeshStandardMaterial({
			color: colorFor(part.kind, base),
			roughness: 0.75,
			metalness: 0,
		});
		const mesh = new THREE.Mesh(geometry, material);
		mesh.position.set(...(part.position.map((value) => value * CM) as [number, number, number]));
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMaterial));
		group.add(mesh);
	}

	return group;
}

function disposeGroup(group: THREE.Object3D) {
	group.traverse((object) => {
		const disposable = object as THREE.Mesh;
		disposable.geometry?.dispose();
		const material = disposable.material;
		if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
		else material?.dispose();
	});
}

/** Live model built from the same pieces as the price, so what the client sees is what is quoted. */
export function Furniture3D({ shape, dimensions, finish, className }: Furniture3DProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [unsupported, setUnsupported] = useState(false);
	const stateRef = useRef<{
		renderer: THREE.WebGLRenderer;
		scene: THREE.Scene;
		camera: THREE.PerspectiveCamera;
		controls: OrbitControls;
		furniture: THREE.Group | null;
		render: () => void;
	} | null>(null);

	// Scene, lights and controls are created once.
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		let renderer: THREE.WebGLRenderer;
		try {
			renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		} catch {
			setUnsupported(true);
			return;
		}

		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		container.appendChild(renderer.domElement);

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);

		scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d4cc, 1.6));
		const sun = new THREE.DirectionalLight(0xffffff, 1.4);
		sun.position.set(2.5, 4, 3);
		sun.castShadow = true;
		sun.shadow.mapSize.set(1024, 1024);
		sun.shadow.radius = 6;
		scene.add(sun);

		const floor = new THREE.Mesh(
			new THREE.PlaneGeometry(20, 20),
			new THREE.ShadowMaterial({ opacity: 0.12 })
		);
		floor.rotation.x = -Math.PI / 2;
		floor.receiveShadow = true;
		scene.add(floor);

		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enablePan = false;
		// The wheel and vertical swipes keep scrolling the page; dragging sideways turns the piece.
		controls.enableZoom = false;
		controls.maxPolarAngle = Math.PI / 2 - 0.05;
		renderer.domElement.style.touchAction = 'pan-y';

		const render = () => renderer.render(scene, camera);
		controls.addEventListener('change', render);

		const resize = () => {
			const { clientWidth, clientHeight } = container;
			if (!clientWidth || !clientHeight) return;
			renderer.setSize(clientWidth, clientHeight);
			camera.aspect = clientWidth / clientHeight;
			camera.updateProjectionMatrix();
			render();
		};
		const observer = new ResizeObserver(resize);
		observer.observe(container);

		stateRef.current = { renderer, scene, camera, controls, furniture: null, render };
		resize();

		return () => {
			observer.disconnect();
			controls.dispose();
			disposeGroup(scene);
			renderer.dispose();
			renderer.domElement.remove();
			stateRef.current = null;
		};
	}, []);

	// The furniture is rebuilt on every change of size or finish.
	useEffect(() => {
		const state = stateRef.current;
		if (!state) return;

		if (state.furniture) {
			state.scene.remove(state.furniture);
			disposeGroup(state.furniture);
		}

		const furniture = buildFurniture(shape, dimensions, finish);
		state.scene.add(furniture);
		state.furniture = furniture;

		// Frames the whole piece from a three-quarter view, the way furniture is usually drawn.
		const box = new THREE.Box3().setFromObject(furniture);
		const center = box.getCenter(new THREE.Vector3());
		const radius = box.getBoundingSphere(new THREE.Sphere()).radius || 1;
		const distance = radius / Math.sin(THREE.MathUtils.degToRad(state.camera.fov / 2));
		state.camera.position.set(
			center.x + distance * 0.62,
			center.y + distance * 0.42,
			center.z + distance * 0.66
		);
		state.controls.target.copy(center);
		state.controls.minDistance = radius * 1.2;
		state.controls.maxDistance = distance * 3;
		state.controls.update();
		state.render();
	}, [shape, dimensions, finish]);

	return (
		<div
			ref={containerRef}
			className={`relative overflow-hidden rounded-lg bg-[#f4f3f0] text-xs text-muted-foreground dark:bg-[#1c1c1a] ${className ?? 'h-64'}`}
			aria-label="Vista 3D del mueble"
		>
			<span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-muted-foreground/80">
				{unsupported ? 'Este dispositivo no puede mostrar la vista 3D.' : 'Arrastrá para girar'}
			</span>
		</div>
	);
}
