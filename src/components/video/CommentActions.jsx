import React from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2, Edit2, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CommentActions({ 
  comment, 
  isOwnComment, 
  onDelete, 
  onEdit, 
  onReport,
  className,
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 shrink-0 text-white/35 hover:bg-white/10 hover:text-white/80',
            className
          )}
          aria-label="Plus d’options"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-white/10 bg-zinc-950 text-white">
        {isOwnComment ? (
          <>
            <DropdownMenuItem onClick={() => onEdit(comment)} className="cursor-pointer focus:bg-white/10 focus:text-white">
              <Edit2 className="w-4 h-4 mr-2" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(comment.id)} 
              className="cursor-pointer text-red-400 focus:bg-red-500/15 focus:text-red-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onClick={() => onReport(comment)} className="cursor-pointer focus:bg-white/10 focus:text-white">
            <Flag className="w-4 h-4 mr-2" />
            Signaler
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}