import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, Route, Image, Plus, X, Upload, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import { useRouteStore } from "@/store/routeStore";
import { toast } from "@/hooks/use-toast";

interface SidebarProps {
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const {
    startCoords,
    endCoords,
    isSelecting,
    routeData,
    roadConditions,
    isLoading,
    setSelecting,
    resetRoute,
    generateRoute,
    addRoadCondition
  } = useRouteStore();

  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [rlRouteResult, setRlRouteResult] = useState<any>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [rlOverallStats, setRlOverallStats] = useState<any>(null);
  const [rlFeedbackStats, setRlFeedbackStats] = useState<any>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedImages(prev => [...prev, ...files]);
    
    // Simulate road condition analysis
    files.forEach((file, index) => {
      const conditions = ['Good', 'Satisfactory', 'Poor', 'Very Poor'];
      const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
      addRoadCondition(randomCondition);
    });
    
    toast({
      title: "Images Analyzed",
      description: `${files.length} road condition(s) detected`,
    });
  };

  const handleGenerateRoute = async () => {
    if (!startCoords || !endCoords) {
      toast({
        title: "Missing Locations",
        description: "Please select both start and destination points first.",
        variant: "destructive",
      });
      return;
    }
    
    await generateRoute();
    toast({
      title: "Route Generated",
      description: "Your route following real roads has been calculated!",
    });
  };

  // RL Route and Feedback logic
  const handleRLRouteTest = async () => {
    if (!startCoords || !endCoords) {
      toast({
        title: "Missing Locations",
        description: "Please select both start and destination points first.",
        variant: "destructive",
      });
      return;
    }
    const response = await fetch("http://localhost:8001/route/rl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start_lat: startCoords[0],
        start_lng: startCoords[1],
        end_lat: endCoords[0],
        end_lng: endCoords[1],
      }),
    });
    const data = await response.json();
    setRlRouteResult(data);
  };

  const handleFeedback = async (type: 'positive' | 'negative') => {
    if (!rlRouteResult || !rlRouteResult.route_coordinates) return;
    setFeedbackLoading(true);
    const response = await fetch("http://localhost:8001/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        route_coordinates: rlRouteResult.route_coordinates,
        feedback: type,
        notes: ''
      }),
    });
    const data = await response.json();
    setFeedbackLoading(false);
    setFeedbackSent(true);
    toast({
      title: data.success ? "Feedback received!" : "Feedback failed",
      description: data.message || (data.success ? "Thank you for your feedback." : "Please try again."),
      variant: data.success ? "default" : "destructive"
    });
  };

  // Fetch RL agent overall stats and feedback stats on mount and every 10s
  useEffect(() => {
    const fetchStats = async () => {
      const rlRes = await fetch("http://localhost:8001/monitor/rl-agent");
      setRlOverallStats(await rlRes.json());
      const fbRes = await fetch("http://localhost:8001/monitor/rl-feedback");
      setRlFeedbackStats(await fbRes.json());
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Reset feedback prompt after every route
  useEffect(() => {
    setFeedbackSent(false);
  }, [routeData]);

  // Automatically trigger RL route after every route generation
  useEffect(() => {
    const fetchRLRoute = async () => {
      if (!startCoords || !endCoords) return;
      const response = await fetch("http://localhost:8001/route/rl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_lat: startCoords[0],
          start_lng: startCoords[1],
          end_lat: endCoords[0],
          end_lng: endCoords[1],
        }),
      });
      const data = await response.json();
      setRlRouteResult(data);
    };
    if (routeData) {
      fetchRLRoute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeData]);

  return (
    <aside className={`
      fixed left-0 top-16 h-[calc(100vh-4rem)] w-80 bg-background border-r border-border
      transform transition-transform duration-300 z-40 overflow-y-auto
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0
    `}>
      <div className="p-4 space-y-6">
        {/* Route Planning Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Route Planning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={isSelecting === 'start' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelecting('start')}
                className="flex items-center gap-2"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4" />
                Start
              </Button>
              <Button
                variant={isSelecting === 'end' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelecting('end')}
                className="flex items-center gap-2"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4" />
                End
              </Button>
            </div>

            {startCoords && (
              <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-xs font-medium text-green-700 dark:text-green-300">Start Location</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {startCoords[0].toFixed(5)}, {startCoords[1].toFixed(5)}
                </p>
              </div>
            )}

            {endCoords && (
              <div className="p-2 bg-red-50 dark:bg-red-950 rounded-lg">
                <p className="text-xs font-medium text-red-700 dark:text-red-300">Destination</p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {endCoords[0].toFixed(5)}, {endCoords[1].toFixed(5)}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleGenerateRoute} 
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Route className="h-4 w-4 mr-2" />
                    Generate Route
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={resetRoute} disabled={isLoading}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {isLoading && (
              <div className="text-center text-sm text-muted-foreground">
                Calculating route following real roads...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Road Condition Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Road Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                disabled={isLoading}
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Upload road images for AI analysis
                </p>
              </label>
            </div>

            {uploadedImages.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  Uploaded: {uploadedImages.length} image(s)
                </p>
                <div className="flex flex-wrap gap-1">
                  {roadConditions.map((condition, index) => (
                    <Badge
                      key={index}
                      variant={
                        condition === 'Good' ? 'default' :
                        condition === 'Satisfactory' ? 'secondary' :
                        'destructive'
                      }
                    >
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Route Information */}
        {routeData && (
          <Card>
            <CardHeader>
              <CardTitle>Route Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Distance</p>
                  <p className="font-medium">{routeData.distance} km</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">{routeData.duration}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Road Quality Score</p>
                <div className="space-y-2">
                  <Progress value={routeData.qualityScore} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {routeData.qualityScore}/100 - {routeData.qualityScore > 80 ? 'Excellent' : 
                     routeData.qualityScore > 60 ? 'Good' : 
                     routeData.qualityScore > 40 ? 'Fair' : 'Poor'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Condition Breakdown</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Good</span>
                    <span>{routeData.conditions.good}%</span>
                  </div>
                  <Progress value={routeData.conditions.good} className="h-1" />
                  
                  <div className="flex justify-between text-xs">
                    <span>Moderate</span>
                    <span>{routeData.conditions.moderate}%</span>
                  </div>
                  <Progress value={routeData.conditions.moderate} className="h-1" />
                  
                  <div className="flex justify-between text-xs">
                    <span>Poor</span>
                    <span>{routeData.conditions.poor}%</span>
                  </div>
                  <Progress value={routeData.conditions.poor} className="h-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RL Route Summary */}
        {routeData && (
          <Card>
            <CardHeader>
              <CardTitle>RL Route Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Green Zone %</p>
                  <p className="font-medium">{rlRouteResult && rlRouteResult.green_percentage !== undefined ? ((rlRouteResult.green_percentage || 0) * 100).toFixed(1) + '%' : '0%'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">RL Reward</p>
                  <p className="font-medium">{rlRouteResult && rlRouteResult.reward !== undefined ? rlRouteResult.reward.toFixed(2) : '0.00'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">RL Agent Explanation</p>
                <p className="text-xs text-muted-foreground">{rlRouteResult && rlRouteResult.explanation ? rlRouteResult.explanation : 'No explanation available.'}</p>
              </div>
              {/* Feedback UI always shown after each route */}
              {!feedbackSent ? (
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm">Was this route satisfactory?</span>
                  <Button size="icon" variant="ghost" onClick={() => handleFeedback('positive')} disabled={feedbackLoading} aria-label="Thumbs up">
                    <ThumbsUp className="h-5 w-5 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleFeedback('negative')} disabled={feedbackLoading} aria-label="Thumbs down">
                    <ThumbsDown className="h-5 w-5 text-red-600" />
                  </Button>
                </div>
              ) : (
                <div className="text-green-600 text-sm mt-2">Thank you for your feedback!</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* RL Agent Overall Progress */}
        <Card>
          <CardHeader>
            <CardTitle>RL Agent Overall Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Avg. Green Zone %</p>
                <p className="font-medium">{rlOverallStats && rlOverallStats.avg_green_percentage !== undefined ? (rlOverallStats.avg_green_percentage * 100).toFixed(1) + '%' : 'Loading...'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg. RL Reward</p>
                <p className="font-medium">{rlOverallStats && rlOverallStats.avg_reward !== undefined ? rlOverallStats.avg_reward.toFixed(2) : 'Loading...'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Avg. User Feedback</p>
              <p className="text-xs text-muted-foreground">
                {rlFeedbackStats && rlFeedbackStats.avg_feedback !== null && rlFeedbackStats.total > 0
                  ? `${(rlFeedbackStats.avg_feedback * 100).toFixed(1)}% positive (${rlFeedbackStats.positive}👍 / ${rlFeedbackStats.negative}👎)`
                  : 'No feedback yet.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
};
