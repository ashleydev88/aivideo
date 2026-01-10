"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function DemoPage() {
    return (
        <DashboardLayout pageTitle="Design System Demo" activeHref="/demo">
            <div className="max-w-6xl mx-auto space-y-10">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                        B2B Compliance Platform Design System
                    </h1>
                    <p className="text-muted-foreground">
                        Brand Archetype: &quot;The Modern Institution&quot; — Trustworthy, Precise, Safe
                    </p>
                </div>

                {/* Color Palette */}
                <section>
                    <h2 className="text-xl font-semibold mb-4">Color Palette</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <div className="h-20 rounded-[var(--radius)] bg-primary flex items-center justify-center text-primary-foreground font-medium">
                                Primary
                            </div>
                            <p className="text-sm text-muted-foreground text-center">Teal-700 #0F766E</p>
                        </div>
                        <div className="space-y-2">
                            <div className="h-20 rounded-[var(--radius)] bg-secondary border border-border flex items-center justify-center text-secondary-foreground font-medium">
                                Secondary
                            </div>
                            <p className="text-sm text-muted-foreground text-center">Slate-100</p>
                        </div>
                        <div className="space-y-2">
                            <div className="h-20 rounded-[var(--radius)] bg-destructive flex items-center justify-center text-destructive-foreground font-medium">
                                Destructive
                            </div>
                            <p className="text-sm text-muted-foreground text-center">Rose-700 #BE123C</p>
                        </div>
                        <div className="space-y-2">
                            <div className="h-20 rounded-[var(--radius)] bg-sidebar-background flex items-center justify-center text-sidebar-foreground font-medium">
                                Sidebar
                            </div>
                            <p className="text-sm text-muted-foreground text-center">Slate-900</p>
                        </div>
                    </div>
                </section>

                {/* Buttons */}
                <section>
                    <h2 className="text-xl font-semibold mb-4">Buttons</h2>
                    <div className="flex flex-wrap gap-4">
                        <Button variant="default">Primary Button</Button>
                        <Button variant="secondary">Secondary Button</Button>
                        <Button variant="destructive">Destructive</Button>
                        <Button variant="outline">Outline</Button>
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="link">Link Button</Button>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-4">
                        <Button size="sm">Small</Button>
                        <Button size="default">Default</Button>
                        <Button size="lg">Large</Button>
                    </div>
                </section>

                {/* Inputs */}
                <section>
                    <h2 className="text-xl font-semibold mb-4">Inputs</h2>
                    <div className="grid md:grid-cols-3 gap-4 max-w-3xl">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Default Input</label>
                            <Input type="text" placeholder="Enter text..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email Input</label>
                            <Input type="email" placeholder="you@example.com" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Disabled</label>
                            <Input type="text" placeholder="Disabled" disabled />
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                        Click on an input to see the teal-500 focus ring.
                    </p>
                </section>

                {/* Cards */}
                <section>
                    <h2 className="text-xl font-semibold mb-4">Cards</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Policy Review</CardTitle>
                                <CardDescription>
                                    Review and approve pending compliance policies
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">
                                    5 policies awaiting your review. Last updated 2 hours ago.
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Button variant="default" size="sm">Review Now</Button>
                            </CardFooter>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Risk Assessment</CardTitle>
                                <CardDescription>
                                    Current risk score and trends
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-primary">87%</div>
                                <p className="text-sm text-muted-foreground">Compliance Score</p>
                            </CardContent>
                            <CardFooter>
                                <Button variant="secondary" size="sm">View Details</Button>
                            </CardFooter>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Audit Trail</CardTitle>
                                <CardDescription>
                                    Recent activity and changes
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">
                                    23 actions logged today across 4 team members.
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Button variant="ghost" size="sm">View Log →</Button>
                            </CardFooter>
                        </Card>
                    </div>
                </section>

                {/* Typography */}
                <section>
                    <h2 className="text-xl font-semibold mb-4">Typography & Radius</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-medium mb-2">Font: Geist Sans</h3>
                            <p className="text-muted-foreground text-sm mb-4">
                                Clean, modern, highly legible typeface
                            </p>
                            <div className="space-y-2">
                                <p className="text-3xl font-bold">Heading 1</p>
                                <p className="text-2xl font-semibold">Heading 2</p>
                                <p className="text-xl font-medium">Heading 3</p>
                                <p className="text-base">Body text</p>
                                <p className="text-sm text-muted-foreground">Muted text</p>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-medium mb-2">Border Radius: 0.3rem</h3>
                            <p className="text-muted-foreground text-sm mb-4">
                                Sharp, professional edges (not bubbly)
                            </p>
                            <div className="flex gap-4 items-center">
                                <div className="w-16 h-16 bg-primary rounded-[var(--radius)]"></div>
                                <div className="w-24 h-10 bg-secondary border border-border rounded-[var(--radius)]"></div>
                                <div className="w-32 h-10 bg-muted rounded-[var(--radius)]"></div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </DashboardLayout>
    );
}
