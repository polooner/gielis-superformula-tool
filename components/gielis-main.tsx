"use client";

import { useState, useCallback, useRef } from "react";
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
  };
  path: string;
  color: string;
  position: {
    x: number;
    y: number;
  };
}

const GielisSuperfomula = () => {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [activeShapeId, setActiveShapeId] = useState<string | null>(null);
  //   const [size, setSize] = useState({ width: 0, height: 0 });
  const [cardSize, setCardSize] = useState({ width: 320, height: 600 });
  const [cardPosition, setCardPosition] = useState({ x: 20, y: 20 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [accordionValue, setAccordionValue] = useState<string[]>([
    "management",
  ]);

  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  //   useEffect(() => {
  //     const updateSize = () => {
  //       setSize({ width: window.innerWidth, height: window.innerHeight });
  //     };
  //     window.addEventListener("resize", updateSize);
  //     updateSize();
  //     return () => window.removeEventListener("resize", updateSize);
  //   }, []);

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
      },
      path: "",
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      position: { x: 0, y: 0 },
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
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox="-500 -500 1000 1000"
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={handleSvgMouseDown}
        style={{ cursor: isDragging ? "grabbing" : "move" }}
      >
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
                fill={shape.color}
                fillOpacity={shape.params.fillOpacity}
                stroke="black"
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
          <CardContent className="flex-grow overflow-hidden p-4 flex flex-col">
            <Accordion
              type="multiple"
              value={accordionValue}
              onValueChange={setAccordionValue}
              className="mb-4"
            >
              <AccordionItem value="management">
                <AccordionTrigger className="flex justify-between">
                  <span>Shape Management</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <Button onClick={addNewShape} className="w-full">
                      Add New Shape
                    </Button>
                    {shapes.map((shape) => (
                      <div
                        key={shape.id}
                        className="flex items-center justify-between"
                      >
                        <ActiveShapeControlButton
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
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <ScrollArea className="flex-grow">
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
                        <Label>Shape Position</Label>
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
}: {
  activeShapeId: string | null;
  setActiveShapeId: (id: string) => void;
  shape: Shape;
  removeShape: (id: string) => void;
  updateShapeId: ({ id, newName }: { id: string; newName: string }) => void;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}) => {
  return (
    <>
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
      ) : (
        <Button
          variant={activeShapeId === shape.id ? "default" : "outline"}
          onClick={() => setActiveShapeId(shape.id)}
          className="flex-grow mr-2"
        >
          Shape {shape.id}
        </Button>
      )}
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
    </>
  );
};
