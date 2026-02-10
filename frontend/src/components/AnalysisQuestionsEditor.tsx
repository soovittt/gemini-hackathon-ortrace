import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { AnalysisQuestion, AnalysisQuestions } from "@/lib/analysisQuestions";

type Props = {
  value: AnalysisQuestions;
  onChange: (value: AnalysisQuestions) => void;
};

const QUESTION_TYPES: Array<{ key: keyof AnalysisQuestions; label: string }> = [
  { key: "bug", label: "Bug" },
  { key: "feedback", label: "Feedback" },
  { key: "idea", label: "Idea" },
];

const AnalysisQuestionsEditor = ({ value, onChange }: Props) => {
  const [newQuestionText, setNewQuestionText] = useState<Record<string, string>>({
    bug: "",
    feedback: "",
    idea: "",
  });

  const updateType = (type: keyof AnalysisQuestions, updater: (list: AnalysisQuestion[]) => AnalysisQuestion[]) => {
    onChange({
      ...value,
      [type]: updater(value[type]),
    });
  };

  const toggleQuestion = (type: keyof AnalysisQuestions, id: string, enabled: boolean) => {
    updateType(type, (list) =>
      list.map((q) => (q.id === id ? { ...q, enabled } : q))
    );
  };

  const removeQuestion = (type: keyof AnalysisQuestions, id: string) => {
    updateType(type, (list) => list.filter((q) => q.id !== id));
  };

  const addQuestion = (type: keyof AnalysisQuestions) => {
    const text = newQuestionText[type].trim();
    if (!text) return;
    const newItem: AnalysisQuestion = {
      id: `${type}-${crypto.randomUUID()}`,
      text,
      enabled: true,
      is_custom: true,
    };
    updateType(type, (list) => [...list, newItem]);
    setNewQuestionText((prev) => ({ ...prev, [type]: "" }));
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">AI Analysis Questions</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Select the questions you want the AI to answer for each ticket type, or add new ones.
        </p>
      </div>
      <Tabs defaultValue="bug" className="p-4">
        <TabsList className="mb-4">
          {QUESTION_TYPES.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {QUESTION_TYPES.map((t) => (
          <TabsContent key={t.key} value={t.key} className="space-y-3">
            <div className="space-y-2">
              {value[t.key].map((q) => (
                <div key={q.id} className="flex items-start gap-3 rounded-md border border-border px-3 py-2">
                  <Checkbox
                    checked={q.enabled}
                    onCheckedChange={(checked) => toggleQuestion(t.key, q.id, Boolean(checked))}
                    className="mt-1"
                  />
                  <div className="flex-1 text-sm text-foreground">{q.text}</div>
                  {q.is_custom && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeQuestion(t.key, q.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add a new question..."
                value={newQuestionText[t.key]}
                onChange={(e) => setNewQuestionText((prev) => ({ ...prev, [t.key]: e.target.value }))}
              />
              <Button variant="outline" size="sm" onClick={() => addQuestion(t.key)}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AnalysisQuestionsEditor;
