export type AnalysisQuestion = {
  id: string;
  text: string;
  enabled: boolean;
  is_custom: boolean;
};

export type AnalysisQuestions = {
  bug: AnalysisQuestion[];
  feedback: AnalysisQuestion[];
  idea: AnalysisQuestion[];
};

export function defaultAnalysisQuestions(): AnalysisQuestions {
  return {
    bug: [
      {
        id: "bug-blocked",
        text: "Is the user completely blocked from completing the task?",
        enabled: true,
        is_custom: false,
      },
      {
        id: "bug-workarounds",
        text: "Did the user try alternative paths or workarounds?",
        enabled: true,
        is_custom: false,
      },
      {
        id: "bug-user-error",
        text: "Is this likely a user error or a product bug?",
        enabled: true,
        is_custom: false,
      },
    ],
    feedback: [
      {
        id: "feedback-friction",
        text: "Where does the user experience friction in the flow?",
        enabled: true,
        is_custom: false,
      },
      {
        id: "feedback-expectation",
        text: "What expectation did the user have that was not met?",
        enabled: true,
        is_custom: false,
      },
      {
        id: "feedback-smoother",
        text: "What would make this experience feel smoother?",
        enabled: true,
        is_custom: false,
      },
    ],
    idea: [
      {
        id: "idea-problem",
        text: "What problem is the user trying to solve?",
        enabled: true,
        is_custom: false,
      },
      {
        id: "idea-benefit",
        text: "What benefit would this feature provide?",
        enabled: true,
        is_custom: false,
      },
      {
        id: "idea-urgency",
        text: "How urgent is this request in their workflow?",
        enabled: true,
        is_custom: false,
      },
    ],
  };
}
