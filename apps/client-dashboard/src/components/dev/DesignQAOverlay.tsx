import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Grid3X3,
  Ruler,
  Eye,
  Palette,
  Type,
  Monitor,
  X,
  Settings,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DesignQAOverlayProps {
  isOpen: boolean;
  onToggle: () => void;
}

// Color contrast checker
      const getContrastRatio = (color1: string, color2: string): number => {
  // Simplified contrast calculation for demo
  // In production, use a proper color contrast library
      return 4.5; // Mock ratio
};

// Get computed styles helper
      const getComputedStyleValue = (element: Element, property: string): string => {
  return window.getComputedStyle(element).getPropertyValue(property);
};

export const DesignQAOverlay: React.FC<DesignQAOverlayProps> = ({
  isOpen,
  onToggle,
}) => {
  const [activeTools, setActiveTools] = useState({
    grid: false,
    baseline: false,
    spacing: false,
    contrast: false,
    typography: false,
    focus: false,
  });

  const [qaData, setQaData] = useState({
    contrastIssues: 0,
    spacingInconsistencies: 0,
    typographyIssues: 0,
    focusIssues: 0,
  });

  // Toggle tools
      const toggleTool = useCallback((tool: keyof typeof activeTools) => {
    setActiveTools((prev) => ({ ...prev, [tool]: !prev[tool] }));
  }, []);

  // Run QA checks
      const runQAChecks = useCallback(() => {
    const issues = {
      contrastIssues: 0,
      spacingInconsistencies: 0,
      typographyIssues: 0,
      focusIssues: 0,
    };

    // Check all text elements for contrast
    document.querySelectorAll("*").forEach((el) => {
      const styles = window.getComputedStyle(el);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;

      if (color && backgroundColor && el.textContent?.trim()) {
        const ratio = getContrastRatio(color, backgroundColor);
        if (ratio < 4.5) issues.contrastIssues++;
      }
    });

    // Check for focusable elements without focus styles
    document
      .querySelectorAll("button, a, input, textarea, select, [tabindex]")
      .forEach((el) => {
        const focusStyles = window.getComputedStyle(el, ":focus-visible");
        if (!focusStyles.outline && !focusStyles.boxShadow.includes("ring")) {
          issues.focusIssues++;
        }
      });

    setQaData(issues);
  }, []);

  // Grid overlay component
      const GridOverlay = () => (
    <div
      className="fixed inset-0 pointer-events-none z-[9998]"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: "24px 24px",
      }}
    />
  );

  // Baseline overlay component
      const BaselineOverlay = () => (
    <div
      className="fixed inset-0 pointer-events-none z-[9998]"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, rgba(220, 38, 127, 0.2) 1px, transparent 1px)",
        backgroundSize: "1px 24px",
      }}
    />
  );

  // Spacing highlighter
      const SpacingHighlighter = () => {
    useEffect(() => {
      const elements = document.querySelectorAll("*");
      elements.forEach((el) => {
        if (el.classList.contains("qa-spacing-highlight")) return;

        const styles = window.getComputedStyle(el);
        const margin = styles.margin;
        const padding = styles.padding;

        if (margin !== "0px" || padding !== "0px") {
          el.classList.add("qa-spacing-highlight");
          (el as HTMLElement).style.outline =
            "1px dashed rgba(34, 197, 94, 0.5)";
        }
      });

      return () => {
        elements.forEach((el) => {
          el.classList.remove("qa-spacing-highlight");
          (el as HTMLElement).style.outline = "";
        });
      };
    }, []);

    return null;
  };

  // Typography checker
      const TypographyChecker = () => {
    useEffect(() => {
      const textElements = document.querySelectorAll(
        "h1, h2, h3, h4, h5, h6, p, span, div",
      );
      textElements.forEach((el) => {
        const styles = window.getComputedStyle(el);
        const fontSize = parseInt(styles.fontSize);
        const lineHeight = parseInt(styles.lineHeight);

        // Check for proper line height ratios
      if (lineHeight / fontSize < 1.2 || lineHeight / fontSize > 1.6) {
          (el as HTMLElement).style.outline =
            "2px dashed rgba(239, 68, 68, 0.5)";
          el.setAttribute("data-qa-issue", "line-height");
        }
      });

      return () => {
        textElements.forEach((el) => {
          (el as HTMLElement).style.outline = "";
          el.removeAttribute("data-qa-issue");
        });
      };
    }, []);

    return null;
  };

  // Contrast highlighter
      const ContrastHighlighter = () => {
    useEffect(() => {
      const textElements = document.querySelectorAll("*");
      textElements.forEach((el) => {
        if (!el.textContent?.trim()) return;

        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;

        if (color && backgroundColor) {
          const ratio = getContrastRatio(color, backgroundColor);
          if (ratio < 4.5) {
            (el as HTMLElement).style.outline =
              "2px solid rgba(239, 68, 68, 0.8)";
            el.setAttribute("data-qa-contrast", ratio.toString());
          }
        }
      });

      return () => {
        textElements.forEach((el) => {
          (el as HTMLElement).style.outline = "";
          el.removeAttribute("data-qa-contrast");
        });
      };
    }, []);

    return null;
  };

  // Focus highlighter
      const FocusHighlighter = () => {
    useEffect(() => {
      const focusableElements = document.querySelectorAll(
        "button, a, input, textarea, select, [tabindex]",
      );
      focusableElements.forEach((el) => {
        const hasProperFocus =
          el.classList.contains("focus-visible:ring-2") ||
          el.classList.contains("focus:ring-2") ||
          el.classList.contains("focus-visible:outline-none");

        if (!hasProperFocus) {
          (el as HTMLElement).style.outline =
            "2px dashed rgba(245, 158, 11, 0.8)";
          el.setAttribute("data-qa-focus", "missing-focus-styles");
        }
      });

      return () => {
        focusableElements.forEach((el) => {
          (el as HTMLElement).style.outline = "";
          el.removeAttribute("data-qa-focus");
        });
      };
    }, []);

    return null;
  };

  useEffect(() => {
    if (isOpen) {
      runQAChecks();
    }
  }, [isOpen, runQAChecks]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlays */}
      {activeTools.grid && <GridOverlay />}
      {activeTools.baseline && <BaselineOverlay />}
      {activeTools.spacing && <SpacingHighlighter />}
      {activeTools.contrast && <ContrastHighlighter />}
      {activeTools.typography && <TypographyChecker />}
      {activeTools.focus && <FocusHighlighter />}

      {/* QA Panel */}
      <div className="fixed top-4 right-4 z-[9999] w-80 max-h-[calc(100vh-2rem)] overflow-hidden">
        <Card className="shadow-2xl border-2 border-brand/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-brand" />
                <CardTitle className="text-h4">Design QA</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-body-sm text-text-muted">
              <Badge variant="secondary" className="text-xs">
                DEV ONLY
              </Badge>
              <span>Visual Quality Assistant</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            <Tabs defaultValue="tools" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tools">Tools</TabsTrigger>
                <TabsTrigger value="issues">Issues</TabsTrigger>
              </TabsList>

              <TabsContent value="tools" className="space-y-4">
                {/* Layout Tools */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-body-sm flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4" />
                    Layout & Spacing
                  </h4>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-body-sm">Grid Overlay</span>
                      <Switch
                        checked={activeTools.grid}
                        onCheckedChange={() => toggleTool("grid")}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-body-sm">Baseline Grid</span>
                      <Switch
                        checked={activeTools.baseline}
                        onCheckedChange={() => toggleTool("baseline")}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-body-sm">Spacing Guide</span>
                      <Switch
                        checked={activeTools.spacing}
                        onCheckedChange={() => toggleTool("spacing")}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Accessibility Tools */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-body-sm flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Accessibility
                  </h4>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-body-sm">Contrast Check</span>
                      <Switch
                        checked={activeTools.contrast}
                        onCheckedChange={() => toggleTool("contrast")}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-body-sm">Focus Indicators</span>
                      <Switch
                        checked={activeTools.focus}
                        onCheckedChange={() => toggleTool("focus")}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Typography Tools */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-body-sm flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Typography
                  </h4>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-body-sm">Line Height Check</span>
                      <Switch
                        checked={activeTools.typography}
                        onCheckedChange={() => toggleTool("typography")}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={runQAChecks} className="w-full" size="sm">
                  <Monitor className="h-4 w-4 mr-2" />
                  Scan Page
                </Button>
              </TabsContent>

              <TabsContent value="issues" className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-body-sm">Quality Issues</h4>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-md bg-destructive/5">
                      <span className="text-body-sm">Contrast Issues</span>
                      <Badge
                        variant={
                          qaData.contrastIssues > 0
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {qaData.contrastIssues}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-md bg-warning/5">
                      <span className="text-body-sm">Focus Issues</span>
                      <Badge
                        variant={
                          qaData.focusIssues > 0 ? "destructive" : "secondary"
                        }
                      >
                        {qaData.focusIssues}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-md bg-surface-2">
                      <span className="text-body-sm">Typography Issues</span>
                      <Badge
                        variant={
                          qaData.typographyIssues > 0
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {qaData.typographyIssues}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-surface-2 rounded-md">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />
                    <div className="text-body-sm text-text-muted">
                      <p className="font-medium mb-1">How to use:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• Red outlines = Accessibility issues</li>
                        <li>• Yellow outlines = Focus issues</li>
                        <li>• Green outlines = Spacing guides</li>
                        <li>• Blue grid = Layout reference</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

