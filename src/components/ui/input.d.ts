import * as React from "react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Toutes les props HTML input sont déjà incluses via InputHTMLAttributes
}

export declare const Input: React.ForwardRefExoticComponent<
  InputProps & React.RefAttributes<HTMLInputElement>
>

