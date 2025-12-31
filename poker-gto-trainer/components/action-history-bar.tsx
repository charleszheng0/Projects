"use client";

import { useGameStore } from "@/store/game-store";
import { Badge } from "./ui/badge";

/**
 * GTO Wizard-style action history breadcrumb bar at the top
 */
export function ActionHistoryBar() {
  const { actionHistory, gameStage, communityCards } = useGameStore();
  
  // Build breadcrumb trail from action history
  const breadcrumbs: Array<{ type: "action" | "street"; label: string; data?: any }> = [];
  
  // Group actions by street
  let currentStreet = "preflop";
  let streetActions: typeof actionHistory = [];
  
  actionHistory.forEach((action, index) => {
    // Check if this is a street transition (would need to track this in store)
    // For now, we'll build from action history
    
    if (action.action.toLowerCase().includes("flop") || 
        action.action.toLowerCase().includes("turn") || 
        action.action.toLowerCase().includes("river")) {
      // Street transition
      if (streetActions.length > 0) {
        breadcrumbs.push({
          type: "street",
          label: currentStreet.toUpperCase(),
          data: { actions: streetActions }
        });
        streetActions = [];
      }
      currentStreet = action.action.toLowerCase();
    } else {
      streetActions.push(action);
    }
  });
  
  // Add current street if we have actions
  if (streetActions.length > 0) {
    breadcrumbs.push({
      type: "street",
      label: currentStreet.toUpperCase(),
      data: { actions: streetActions }
    });
  }
  
  // Add current street if no actions yet
  if (actionHistory.length === 0) {
    breadcrumbs.push({
      type: "street",
      label: gameStage.toUpperCase(),
      data: { actions: [] }
    });
  }
  
  // Add community cards to street markers
  const getStreetCards = (street: string) => {
    if (street === "FLOP" && communityCards.length >= 3) {
      return communityCards.slice(0, 3);
    }
    if (street === "TURN" && communityCards.length >= 4) {
      return [communityCards[3]];
    }
    if (street === "RIVER" && communityCards.length >= 5) {
      return [communityCards[4]];
    }
    return [];
  };

  return (
    <div className="w-full bg-[#0f0f0f] border-b border-gray-800 px-4 py-2 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max">
        {breadcrumbs.map((crumb, index) => {
          if (crumb.type === "street") {
            const cards = getStreetCards(crumb.label);
            return (
              <div key={index} className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className="bg-gray-800 text-gray-300 border-gray-700 px-3 py-1 text-xs font-medium"
                >
                  {crumb.label}
                  {cards.length > 0 && (
                    <span className="ml-2 text-gray-400">
                      {cards.map((card, i) => (
                        <span key={i} className="mx-0.5">{card.rank}</span>
                      ))}
                    </span>
                  )}
                </Badge>
                {crumb.data?.actions?.map((action: any, actionIndex: number) => (
                  <div key={actionIndex} className="flex items-center gap-1">
                    <Badge 
                      variant="outline"
                      className={`px-2 py-1 text-xs font-medium ${
                        action.player === "You"
                          ? "bg-blue-900/30 text-blue-300 border-blue-600"
                          : "bg-gray-700/50 text-gray-300 border-gray-600"
                      }`}
                    >
                      {action.player} {action.action}
                      {action.betSize && ` ${action.betSize}`}
                    </Badge>
                  </div>
                ))}
                {index < breadcrumbs.length - 1 && (
                  <span className="text-gray-600 mx-1">→</span>
                )}
              </div>
            );
          }
          return null;
        })}
        
        {/* Show individual actions in a simpler format */}
        {actionHistory.length > 0 && (
          <>
            {actionHistory.map((action, index) => (
              <div key={index} className="flex items-center gap-1">
                <Badge 
                  variant="outline"
                  className={`px-2 py-1 text-xs font-medium ${
                    action.player === "You"
                      ? "bg-blue-900/30 text-blue-300 border-blue-600"
                      : "bg-gray-700/50 text-gray-300 border-gray-600"
                  }`}
                >
                  {action.player} {action.action}
                  {action.betSize && ` ${action.betSize}`}
                </Badge>
                {index < actionHistory.length - 1 && (
                  <span className="text-gray-600 mx-1">→</span>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

