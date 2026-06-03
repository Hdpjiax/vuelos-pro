"use client";

import { useState, type ReactNode } from "react";
import { CustomSelect, type CustomSelectOption } from "./CustomSelect";

type CustomSelectFieldProps = {
  name: string;
  label?: string;
  defaultValue?: string;
  options: CustomSelectOption[];
  required?: boolean;
  icon?: ReactNode;
  placeholder?: string;
  className?: string;
};

export function CustomSelectField({
  name,
  label,
  defaultValue = "",
  options,
  required,
  icon,
  placeholder,
  className,
}: CustomSelectFieldProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <CustomSelect
      name={name}
      label={label}
      value={value}
      onChange={setValue}
      options={options}
      required={required}
      icon={icon}
      placeholder={placeholder}
      className={className}
    />
  );
}
