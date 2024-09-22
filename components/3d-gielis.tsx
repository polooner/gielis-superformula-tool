"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface Shape {
  params: {
    a: [number, number];
    m: number;
    n1: number;
    n2: number;
    n3: number;
  };
}

interface ColorSettings {
  background: string;
  startColor: string;
  endColor: string;
}

const calculate3DPoints = (params: Shape["params"]) => {
  const { a, m, n1, n2, n3 } = params;
  const points = [];

  const uStep = 0.05;
  const vStep = 0.05;
  const uMin = -Math.PI;
  const uMax = Math.PI;
  const vMin = -Math.PI / 2;
  const vMax = Math.PI / 2;

  for (let u = uMin; u <= uMax; u += uStep) {
    for (let v = vMin; v <= vMax; v += vStep) {
      const raux1 =
        Math.pow(Math.abs((1 / a[0]) * Math.abs(Math.cos((m * u) / 4))), n2) +
        Math.pow(Math.abs((1 / a[1]) * Math.abs(Math.sin((m * u) / 4))), n3);
      const r1 = Math.pow(Math.abs(raux1), -1 / n1);

      const raux2 =
        Math.pow(Math.abs((1 / a[0]) * Math.abs(Math.cos((m * v) / 4))), n2) +
        Math.pow(Math.abs((1 / a[1]) * Math.abs(Math.sin((m * v) / 4))), n3);
      const r2 = Math.pow(Math.abs(raux2), -1 / n1);

      const x = r1 * Math.cos(u) * r2 * Math.cos(v);
      const y = r1 * Math.sin(u) * r2 * Math.cos(v);
      const z = r2 * Math.sin(v);

      points.push(new THREE.Vector3(x, y, z));
    }
  }

  return points;
};

export default function GielisSuperformulaWebGLColors() {
  const [params, setParams] = useState<Shape["params"]>({
    a: [1, 1],
    m: 6,
    n1: 1,
    n2: 1,
    n3: 1,
  });

  const [colorSettings, setColorSettings] = useState<ColorSettings>({
    background: "#000000",
    startColor: "#ff0000",
    endColor: "#0000ff",
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 2;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Initial shape creation
    const points = calculate3DPoints(params);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.PointsMaterial({
      size: 0.01,
      vertexColors: true,
    });
    const pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);
    pointsRef.current = pointCloud;

    // Color attribute
    updateColors(points, colorSettings);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [colorSettings, params]);

  useEffect(() => {
    if (!sceneRef.current || !pointsRef.current || !rendererRef.current) return;

    const points = calculate3DPoints(params);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    updateColors(points, colorSettings);

    pointsRef.current.geometry.dispose();
    pointsRef.current.geometry = geometry;

    rendererRef.current.setClearColor(
      new THREE.Color(colorSettings.background)
    );
  }, [params, colorSettings]);

  const updateColors = (
    points: THREE.Vector3[],
    colorSettings: ColorSettings
  ) => {
    if (!pointsRef.current) return;

    const startColor = new THREE.Color(colorSettings.startColor);
    const endColor = new THREE.Color(colorSettings.endColor);
    const colors = new Float32Array(points.length * 3);

    for (let i = 0; i < points.length; i++) {
      const t = (points[i].y + 1) / 2; // Normalize y to [0, 1]
      const color = new THREE.Color().lerpColors(startColor, endColor, t);
      color.toArray(colors, i * 3);
    }

    pointsRef.current.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3)
    );
  };

  const updateParam = (
    key: keyof Shape["params"],
    value: number | [number, number]
  ) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const updateColorSetting = (key: keyof ColorSettings, value: string) => {
    setColorSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="relative h-screen">
      <div ref={containerRef} className="absolute inset-0" />
      <Card className="absolute top-4 right-4 w-64 p-4 space-y-4 bg-background/80 backdrop-blur-sm">
        <h2 className="text-lg font-semibold mb-4">Parameters</h2>
        <div>
          <Label>a[0]</Label>
          <Slider
            value={[params.a[0]]}
            onValueChange={([value]) => updateParam("a", [value, params.a[1]])}
            min={0.1}
            max={2}
            step={0.1}
          />
        </div>
        <div>
          <Label>a[1]</Label>
          <Slider
            value={[params.a[1]]}
            onValueChange={([value]) => updateParam("a", [params.a[0], value])}
            min={0.1}
            max={2}
            step={0.1}
          />
        </div>
        <div>
          <Label>m</Label>
          <Slider
            value={[params.m]}
            onValueChange={([value]) => updateParam("m", value)}
            min={0}
            max={10}
            step={1}
          />
        </div>
        <div>
          <Label>n1</Label>
          <Slider
            value={[params.n1]}
            onValueChange={([value]) => updateParam("n1", value)}
            min={0.1}
            max={5}
            step={0.1}
          />
        </div>
        <div>
          <Label>n2</Label>
          <Slider
            value={[params.n2]}
            onValueChange={([value]) => updateParam("n2", value)}
            min={0.1}
            max={5}
            step={0.1}
          />
        </div>
        <div>
          <Label>n3</Label>
          <Slider
            value={[params.n3]}
            onValueChange={([value]) => updateParam("n3", value)}
            min={0.1}
            max={5}
            step={0.1}
          />
        </div>
        <h2 className="text-lg font-semibold mt-6 mb-4">Colors</h2>
        <div>
          <Label htmlFor="bgColor">Background</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="bgColor"
              type="color"
              value={colorSettings.background}
              onChange={(e) => updateColorSetting("background", e.target.value)}
              className="w-12 h-8 p-0 border-none"
            />
            <Input
              type="text"
              value={colorSettings.background}
              onChange={(e) => updateColorSetting("background", e.target.value)}
              className="flex-grow"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="startColor">Start Color</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="startColor"
              type="color"
              value={colorSettings.startColor}
              onChange={(e) => updateColorSetting("startColor", e.target.value)}
              className="w-12 h-8 p-0 border-none"
            />
            <Input
              type="text"
              value={colorSettings.startColor}
              onChange={(e) => updateColorSetting("startColor", e.target.value)}
              className="flex-grow"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="endColor">End Color</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="endColor"
              type="color"
              value={colorSettings.endColor}
              onChange={(e) => updateColorSetting("endColor", e.target.value)}
              className="w-12 h-8 p-0 border-none"
            />
            <Input
              type="text"
              value={colorSettings.endColor}
              onChange={(e) => updateColorSetting("endColor", e.target.value)}
              className="flex-grow"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
