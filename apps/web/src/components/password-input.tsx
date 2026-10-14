import { useState } from "react";
import type { ComponentProps } from "react";

import { Eye, EyeOff } from "lucide-react";

import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";

type PasswordInputProps = Omit<ComponentProps<"input">, "className" | "type">;

export function PasswordInput(inputProps: PasswordInputProps) {
  const [hasValue, setHasValue] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative flex w-full">
      <Input
        {...inputProps}
        onChange={(event) => {
          setHasValue(event.target.value.length > 0);
          if (!event.target.value) setVisible(false);
          inputProps.onChange?.(event);
        }}
        type={visible ? "text" : "password"}
        className="bg-background h-11 w-full px-3 pr-12 text-sm"
      />
      {hasValue && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 size-8 -translate-y-1/2"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      )}
    </span>
  );
}
