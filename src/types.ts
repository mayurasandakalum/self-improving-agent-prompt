export interface Turn {
  role: "agent" | "user" | "system";
  text: string;
  timestamp?: string;
}

export interface ValidationResult {
  passed: boolean;
  failures: string[];
}
