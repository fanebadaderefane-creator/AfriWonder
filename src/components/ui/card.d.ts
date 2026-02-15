import * as React from "react"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

export declare const Card: React.ForwardRefExoticComponent<
  CardProps & React.RefAttributes<HTMLDivElement>
>
export declare const CardHeader: React.ForwardRefExoticComponent<
  CardHeaderProps & React.RefAttributes<HTMLDivElement>
>
export declare const CardTitle: React.ForwardRefExoticComponent<
  CardTitleProps & React.RefAttributes<HTMLDivElement>
>
export declare const CardDescription: React.ForwardRefExoticComponent<
  CardProps & React.RefAttributes<HTMLDivElement>
>
export declare const CardContent: React.ForwardRefExoticComponent<
  CardContentProps & React.RefAttributes<HTMLDivElement>
>
export declare const CardFooter: React.ForwardRefExoticComponent<
  CardProps & React.RefAttributes<HTMLDivElement>
>
