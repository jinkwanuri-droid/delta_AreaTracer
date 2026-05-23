import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface Option {
  id: string;
  name: string;
  color?: string;
}

interface SelectorPopoverProps {
  label?: string;
  labelClassName?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  className?: string;
  placeholder?: string;
}

export default function SelectorPopover({ 
  label, 
  labelClassName,
  options, 
  value, 
  onChange, 
  icon, 
  className,
  placeholder = "선택하세요" 
}: SelectorPopoverProps) {
  const selectedOption = options.find(o => o.id === value);
  const [open, setOpen] = React.useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className={clsx(
          "group flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95 outline-none focus:ring-2 focus:ring-indigo-500/20",
          className
        )}>
          {icon && <span className="text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0">{icon}</span>}
          <div className="flex-1 flex items-center gap-1.5 leading-none text-[11px] font-bold text-left overflow-hidden">
            {label && (
              <>
                <span className={clsx("text-[10px] font-extrabold uppercase tracking-tighter shrink-0", labelClassName || "text-slate-400")}>{label}</span>
                <span className="text-slate-300 shrink-0">|</span>
              </>
            )}
            <span className="truncate text-slate-700 flex-1">
              {selectedOption ? selectedOption.name : placeholder}
            </span>
          </div>
          <ChevronDown size={12} className="text-slate-300 group-hover:text-indigo-400 transition-colors ml-1 shrink-0" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content 
          className="z-[100] min-w-[160px] bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 animate-in fade-in zoom-in duration-150 origin-top"
          align="start"
          sideOffset={5}
        >
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {options.map(option => {
              const isSelected = option.id === value;
              return (
                <button
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                  className={clsx(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold transition-all text-left mb-0.5 last:mb-0",
                    isSelected 
                      ? "bg-indigo-50 text-indigo-700 shadow-sm" 
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {option.color && (
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: option.color }} />
                    )}
                    <span className="truncate">{option.name}</span>
                  </div>
                  {isSelected && <Check size={12} className="text-indigo-500 shrink-0" />}
                </button>
              );
            })}
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
