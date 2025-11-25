import { Search, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const renderFilter = (filter: any) => {
  const {
    type,
    label,
    value,
    min,
    max,
    step,
    onChange,
    options,
    placeholder,
    format,
  } = filter;

  switch (type) {
    case "search":
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder={placeholder || ""}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      );

    case "select":
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={placeholder || "Select"} />
            </SelectTrigger>
            <SelectContent>
              {options && options.length > 0 ? (
                options.map((opt: any) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))
              ) : (
                <div>No options found</div>
              )}
            </SelectContent>
          </Select>
        </div>
      );

    case "range":
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <div className="px-2">
            <Slider
              value={[value[0], value[1]]}
              onValueChange={onChange}
              max={max}
              step={step}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>{format ? format(value[0]) : value[0]}</span>
              <span>{format ? format(value[1]) : value[1]}</span>
            </div>
          </div>
        </div>
      );

    case "range-single":
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <div className="px-2">
            <Slider
              value={[value]}
              onValueChange={onChange}
              max={max}
              min={min ?? 0}
              step={step}
              className="w-full"
            />
            <div className="text-xs text-slate-500 mt-1">
              {format ? format(value) : value}
            </div>
          </div>
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center justify-between space-y-2">
          <Label htmlFor={label}>{label}</Label>
          <Switch id={label} checked={value} onCheckedChange={onChange} />
        </div>
      );

    default:
      return null;
  }
};

export default renderFilter;
