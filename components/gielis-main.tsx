"use client";

import React, { useState, useCallback, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Rnd } from "react-rnd";
import {
  Plus,
  Minus,
  MoveHorizontal,
  MoveVertical,
  Trash2,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ChromePicker, CirclePicker } from "react-color";
import { Separator } from "./ui/separator";

interface Shape {
  id: string;
  params: {
    a: number;
    b: number;
    m: number;
    n1: number;
    n2: number;
    n3: number;
    scale: number;
    rotation: number;
    points: number;
    fillOpacity: number;
    strokeWidth: number;
    fillNoiseScale: number;
    fillNoiseStrength: number;
    strokeNoiseScale: number;
    strokeNoiseStrength: number;
  };
  path: string;
  color: string;
  position: {
    x: number;
    y: number;
  };
}

const noise2D = (x: number, y: number, scale: number) => {
  const X = Math.floor(x * scale);
  const Y = Math.floor(y * scale);
  return (Math.sin(X * 12.9898 + Y * 78.233) * 43758.5453) % 1;
};

// Add this function to create a noise pattern
const createNoisePattern = (
  scale: number,
  strength: number,
  baseColor: string
) => {
  const patternSize = 100;
  const canvas = document.createElement("canvas");
  canvas.width = patternSize;
  canvas.height = patternSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const imageData = ctx.createImageData(patternSize, patternSize);
  const baseColorRGB = hexToRgb(baseColor);

  for (let y = 0; y < patternSize; y++) {
    for (let x = 0; x < patternSize; x++) {
      const i = (y * patternSize + x) * 4;
      const noiseValue = noise2D(x, y, scale) * strength;
      imageData.data[i] = Math.max(
        0,
        Math.min(255, baseColorRGB.r + noiseValue * 255)
      );
      imageData.data[i + 1] = Math.max(
        0,
        Math.min(255, baseColorRGB.g + noiseValue * 255)
      );
      imageData.data[i + 2] = Math.max(
        0,
        Math.min(255, baseColorRGB.b + noiseValue * 255)
      );
      imageData.data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

const GielisSuperfomula = () => {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [activeShapeId, setActiveShapeId] = useState<string | null>(null);
  const [color, setColor] = useState("#000000");
  const [cardSize, setCardSize] = useState({ width: 320, height: 600 });
  const [cardPosition, setCardPosition] = useState({ x: 20, y: 20 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [accordionValue, setAccordionValue] = useState<string[]>([
    "management",
  ]);
  const [extraOffsetX, setExtraOffsetX] = useState(0);
  const [extraOffsetY, setExtraOffsetY] = useState(0);

  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const calculatePoints = useCallback((params: Shape["params"]) => {
    const points = [];
    const centerX = 0;
    const centerY = 0;
    for (let i = 0; i < params.points; i++) {
      const phi = (i / params.points) * Math.PI * 2;
      const r = gielisFormula(phi, params);
      const x = r * Math.cos(phi + params.rotation) * params.scale + centerX;
      const y = r * Math.sin(phi + params.rotation) * params.scale + centerY;
      points.push([x, y]);
    }
    return points;
  }, []);

  const gielisFormula = (phi: number, params: Shape["params"]) => {
    const { a, b, m, n1, n2, n3 } = params;
    const part1 = Math.pow(Math.abs(Math.cos((m * phi) / 4) / a), n2);
    const part2 = Math.pow(Math.abs(Math.sin((m * phi) / 4) / b), n3);
    return Math.pow(part1 + part2, -1 / n1);
  };

  const pointsToPath = (points: number[][]) => {
    return (
      points.reduce(
        (acc, [x, y], i) => (i === 0 ? `M${x},${y}` : `${acc} L${x},${y}`),
        ""
      ) + "Z"
    );
  };

  const updateParam = (key: string, value: number) => {
    if (!activeShapeId) return;
    setShapes((prevShapes) =>
      prevShapes.map((shape) => {
        if (shape.id === activeShapeId) {
          const newParams = { ...shape.params, [key]: value };
          const points = calculatePoints(newParams);
          const path = pointsToPath(points);
          return { ...shape, params: newParams, path };
        }
        return shape;
      })
    );
  };

  const updateShapePosition = (id: string, x: number, y: number) => {
    setShapes((prevShapes) =>
      prevShapes.map((shape) => {
        if (shape.id === id) {
          return { ...shape, position: { x, y } };
        }
        return shape;
      })
    );
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.max(0.1, Math.min(10, prev + delta)));
  };

  const handlePan = (dx: number, dy: number) => {
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handleMouseDown = (
    event: React.MouseEvent<SVGGElement>,
    shapeId: string
  ) => {
    if (event.button !== 0) return; // Only left mouse button
    event.stopPropagation();
    setActiveShapeId(shapeId);
    setIsDragging(true);

    const startX = event.clientX;
    const startY = event.clientY;
    const shape = shapes.find((s) => s.id === shapeId);
    if (!shape) return;

    const startPositionX = shape.position.x;
    const startPositionY = shape.position.y;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;
      updateShapePosition(shapeId, startPositionX + dx, startPositionY + dy);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleSvgMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    if (event.button !== 0 || isDragging) return; // Only left mouse button and not dragging a shape

    const startX = event.clientX;
    const startY = event.clientY;
    const startPanX = pan.x;
    const startPanY = pan.y;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;
      setPan({ x: startPanX + dx, y: startPanY + dy });
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const addNewShape = () => {
    const newShape: Shape = {
      id: Date.now().toString(),
      params: {
        a: 1,
        b: 1,
        m: 6,
        n1: 1,
        n2: 1,
        n3: 1,
        scale: 100,
        rotation: 0,
        points: 1000,
        fillOpacity: 0.5,
        strokeWidth: 1,
        fillNoiseScale: 0,
        fillNoiseStrength: 0,
        strokeNoiseScale: 0,
        strokeNoiseStrength: 0,
      },
      path: "",
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      position: {
        x:
          0 +
          extraOffsetX +
          (activeShapeId
            ? shapes.find((shape) => shape.id === activeShapeId)?.position.x ??
              0
            : 0),
        y:
          0 +
          extraOffsetY +
          (activeShapeId
            ? shapes.find((shape) => shape.id === activeShapeId)?.position.y ??
              0
            : 0),
      },
    };
    const points = calculatePoints(newShape.params);
    newShape.path = pointsToPath(points);
    setShapes((prevShapes) => [...prevShapes, newShape]);

    setActiveShapeId(newShape.id);
    setEditingShapeId(null);
  };

  const removeShape = (id: string) => {
    setShapes((prevShapes) => prevShapes.filter((shape) => shape.id !== id));
    if (activeShapeId === id) {
      setActiveShapeId(null);
    }
  };

  const updateShapeId = ({ id, newName }: { id: string; newName: string }) => {
    setShapes((prevShapes) =>
      prevShapes.map((shape) => {
        if (shape.id === id) {
          return { ...shape, id: newName };
        }
        return shape;
      })
    );
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-100">
      <div className="absolute top-0 right-2 ml-auto h-full">
        <Link
          className="ml-auto underline text-black"
          href="/3dgielis"
          target="_blank"
        >
          Try the 3D formula version &rarr;
        </Link>
      </div>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox="-500 -500 1000 1000"
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={handleSvgMouseDown}
        style={{ cursor: isDragging ? "grabbing" : "move" }}
      >
        <defs>
          {shapes.map((shape) => (
            <React.Fragment key={`patterns-${shape.id}`}>
              <pattern
                id={`fillNoisePattern-${shape.id}`}
                patternUnits="userSpaceOnUse"
                width="100"
                height="100"
              >
                <image
                  href={createNoisePattern(
                    shape.params.fillNoiseScale,
                    shape.params.fillNoiseStrength,
                    shape.color
                  )}
                  x="0"
                  y="0"
                  width="100"
                  height="100"
                />
              </pattern>
              <pattern
                id={`strokeNoisePattern-${shape.id}`}
                patternUnits="userSpaceOnUse"
                width="100"
                height="100"
              >
                <image
                  href={createNoisePattern(
                    shape.params.strokeNoiseScale,
                    shape.params.strokeNoiseStrength,
                    "black"
                  )}
                  x="0"
                  y="0"
                  width="100"
                  height="100"
                />
              </pattern>
            </React.Fragment>
          ))}
        </defs>
        <g transform={`scale(${zoom}) translate(${pan.x}, ${pan.y})`}>
          {shapes.map((shape) => (
            <g
              key={shape.id}
              transform={`translate(${shape.position.x}, ${shape.position.y})`}
              onMouseDown={(e) => handleMouseDown(e, shape.id)}
              style={{ cursor: "grab" }}
            >
              <path
                d={shape.path}
                fill={`url(#fillNoisePattern-${shape.id})`}
                fillOpacity={shape.params.fillOpacity}
                stroke={`url(#strokeNoisePattern-${shape.id})`}
                strokeWidth={shape.params.strokeWidth}
              />
            </g>
          ))}
        </g>
      </svg>

      <Rnd
        size={{ width: cardSize.width, height: cardSize.height }}
        position={{ x: cardPosition.x, y: cardPosition.y }}
        onDragStop={(e, d) => setCardPosition({ x: d.x, y: d.y })}
        onResizeStop={(e, direction, ref, delta, position) => {
          setCardSize({
            width: parseInt(ref.style.width, 10),
            height: parseInt(ref.style.height, 10),
          });
          setCardPosition(position);
        }}
        minWidth={200}
        minHeight={200}
        bounds="window"
      >
        <Card
          ref={cardRef}
          className="w-full h-full bg-background/80 backdrop-blur-sm overflow-hidden flex flex-col"
        >
          <CardHeader
            ref={headerRef}
            className="cursor-move flex-shrink-0 p-4 pb-2"
          >
            <CardTitle className="text-lg font-medium leading-tight break-words">
              Gielis Superformula Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden overflow-y-auto p-4 pt-0 flex flex-col">
            <Accordion
              type="multiple"
              value={accordionValue}
              onValueChange={setAccordionValue}
              className="mb-4"
            >
              <AccordionItem value="management">
                <AccordionTrigger className="flex justify-between font-bold">
                  <span>Shape Management</span>
                </AccordionTrigger>
                <AccordionContent className="p-1">
                  <div className="space-y-4 h-full flex flex-col ">
                    <Button
                      onClick={addNewShape}
                      className="w-full whitespace-pre-wrap"
                    >
                      Add New Shape
                    </Button>
                    <p className="whitespace-pre-wrap">
                      Place at current active shape position and:
                    </p>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="flex flex-col space-y-2">
                        <Label>&rarr; extra x-offset </Label>
                        <Input
                          value={extraOffsetX}
                          onChange={(e) =>
                            setExtraOffsetX(parseInt(e.target.value))
                          }
                          type="number"
                          id="placeAtPosition"
                          placeholder="pick"
                          className="flex-grow"
                        />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Label>&uarr; extra y-offset </Label>
                        <Input
                          value={extraOffsetY}
                          onChange={(e) =>
                            setExtraOffsetY(parseInt(e.target.value))
                          }
                          type="number"
                          id="placeAtPosition"
                          placeholder="pick"
                          className="flex-grow"
                        />
                      </div>
                    </div>
                    <p>color:</p>
                    <CirclePicker
                      color={color}
                      onChange={(color) => setColor(color.hex)}
                      circleSize={12}
                      colors={[
                        "#000000", // black
                        "#D3D3D3", // light gray
                        "#FFFFFF", // white
                        "#808080", // neutral
                        "#00000000", // transparent
                        "#008000", // green
                        "#90EE90", // light green
                        "#ADD8E6", // light blue
                        "#0000FF", // blue
                      ]}
                    />
                    <Separator />
                    <Label>Shapes</Label>
                    <div className="flex-grow max-h-[200px] overflow-y-auto space-y-4 scrollbar-grey-thumb p-1">
                      {shapes.map((shape) => (
                        <div
                          key={shape.id}
                          className="flex items-center justify-between"
                        >
                          <ActiveShapeControlButton
                            setShapes={setShapes}
                            key={shape.id}
                            activeShapeId={activeShapeId}
                            setActiveShapeId={setActiveShapeId}
                            shape={shape}
                            removeShape={removeShape}
                            updateShapeId={updateShapeId}
                            isEditing={editingShapeId === shape.id}
                            setIsEditing={(isEditing) =>
                              setEditingShapeId(isEditing ? shape.id : null)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <ScrollArea className="flex-grow p-1">
              <div className="space-y-4 pr-4">
                <div className="flex justify-between items-center">
                  <Label>Zoom</Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleZoom(-0.1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span>{zoom.toFixed(1)}x</span>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleZoom(0.1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <Label>Pan</Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handlePan(-10, 0)}
                    >
                      <MoveHorizontal className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handlePan(0, -10)}
                    >
                      <MoveVertical className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handlePan(10, 0)}
                    >
                      <MoveHorizontal className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handlePan(0, 10)}
                    >
                      <MoveVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {activeShapeId &&
                  shapes.find((shape) => shape.id === activeShapeId) && (
                    <>
                      <div className="space-y-2">
                        <Label className="font-bold">Shape Position</Label>
                        <div className="flex space-x-2">
                          <div className="flex-1 space-y-1">
                            <Label htmlFor="positionX">X</Label>
                            <Input
                              id="positionX"
                              type="number"
                              value={
                                shapes.find(
                                  (shape) => shape.id === activeShapeId
                                )?.position.x ?? 0
                              }
                              onChange={(e) =>
                                updateShapePosition(
                                  activeShapeId,
                                  parseFloat(e.target.value),
                                  shapes.find(
                                    (shape) => shape.id === activeShapeId
                                  )?.position.y ?? 0
                                )
                              }
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label htmlFor="positionY">Y</Label>
                            <Input
                              id="positionY"
                              type="number"
                              value={
                                shapes.find(
                                  (shape) => shape.id === activeShapeId
                                )?.position.y ?? 0
                              }
                              onChange={(e) =>
                                updateShapePosition(
                                  activeShapeId,
                                  shapes.find(
                                    (shape) => shape.id === activeShapeId
                                  )?.position.x ?? 0,
                                  parseFloat(e.target.value)
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                      {Object.entries(
                        shapes.find((shape) => shape.id === activeShapeId)
                          ?.params ?? {}
                      ).map(([key, value]) => (
                        <div key={key} className="space-y-2">
                          <div className="flex justify-between">
                            <Label htmlFor={key}>{key}</Label>
                            <Input
                              id={key}
                              type="number"
                              value={value}
                              onChange={(e) =>
                                updateParam(key, parseFloat(e.target.value))
                              }
                              className="w-20"
                            />
                          </div>
                          <Slider
                            value={[value]}
                            min={key === "points" ? 10 : 0}
                            max={
                              key === "points"
                                ? 2000
                                : key === "scale"
                                ? 1000
                                : 10
                            }
                            step={key === "points" ? 10 : 0.1}
                            onValueChange={([newValue]) =>
                              updateParam(key, newValue)
                            }
                          />
                        </div>
                      ))}
                    </>
                  )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </Rnd>
    </div>
  );
};

export default GielisSuperfomula;

const ActiveShapeControlButton = ({
  activeShapeId,
  setActiveShapeId,
  shape,
  removeShape,
  updateShapeId,
  isEditing,
  setIsEditing,
  setShapes,
}: {
  activeShapeId: string | null;
  setActiveShapeId: (id: string) => void;
  shape: Shape;
  removeShape: (id: string) => void;
  updateShapeId: ({ id, newName }: { id: string; newName: string }) => void;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  setShapes: React.Dispatch<React.SetStateAction<Shape[]>>;
}) => {
  return (
    <Card className="w-full bg-transparent p-1">
      <div className="flex items-center">
        {isEditing ? (
          <Input
            value={shape.id}
            onChange={(e) => {
              console.log(e.target.value);
              updateShapeId({ id: shape.id, newName: e.target.value });
            }}
            onBlur={() => setIsEditing(false)}
            autoFocus
          />
        ) : activeShapeId === shape.id ? (
          <ActiveShapeControlColorPopover shape={shape} setShapes={setShapes} />
        ) : (
          <Button
            variant="outline"
            onClick={() => setActiveShapeId(shape.id)}
            className="flex-grow mr-2"
          >
            {shape.id}
          </Button>
        )}
        <div className="flex items-center ml-auto space-x-1">
          <Button
            size="icon"
            variant="outline"
            onClick={() => {
              setIsEditing(!isEditing);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            onClick={() => removeShape(shape.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="effects" className="border-none">
          <AccordionTrigger>Effects</AccordionTrigger>
          <AccordionContent>
            <div className="flex items-center space-x-2">
              <Label>Fill Noise Scale</Label>
              <Input
                value={shape.params.fillNoiseScale}
                onChange={(e) =>
                  updateParam("fillNoiseScale", parseFloat(e.target.value))
                }
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion> */}
    </Card>
  );
};

const ActiveShapeControlColorPopover = ({
  shape,
  setShapes,
}: {
  shape: Shape;
  setShapes: React.Dispatch<React.SetStateAction<Shape[]>>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tempColor, setTempColor] = useState(shape.color);
  const popoverContentRef = useRef<HTMLDivElement>(null);

  const handlePopoverInteraction = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  const handleColorChange = (color: { hex: string }) => {
    setTempColor(color.hex);
    if (!isDragging) {
      setShapes((prevShapes) =>
        prevShapes.map((s) =>
          s.id === shape.id ? { ...s, color: color.hex } : s
        )
      );
    }
  };

  //
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setShapes((prevShapes) =>
      prevShapes.map((s) =>
        s.id === shape.id ? { ...s, color: tempColor } : s
      )
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          className="w-full flex-grow mr-2"
          style={{ backgroundColor: shape.color }}
          variant="outline"
        >
          {shape.id}
        </Button>
      </PopoverTrigger>

      <PopoverContent asChild className="p-0 w-fit">
        <div
          ref={popoverContentRef}
          onMouseDown={handlePopoverInteraction}
          onMouseUp={handlePopoverInteraction}
        >
          <ChromePicker
            color={tempColor}
            onChange={handleColorChange}
            // @ts-expect-error idk
            onMouseDown={() => handleMouseDown()}
            onMouseUp={handleMouseUp}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};
