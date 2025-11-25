import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

interface DynamicSelectProps {
  value: number | string;
  onChange: (value: number) => void;
  options: { value: number | string; label: string }[];
  className?: string;
}

const DynamicSelect: React.FC<DynamicSelectProps> = ({
  value,
  onChange,
  options,
  className,
}) => {
  return (
    <Select
      value={value.toString()}
      onValueChange={(val) => onChange(Number(val))}
    >
      <SelectTrigger className={className || "w-32"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value.toString()} value={opt.value.toString()}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default DynamicSelect;
