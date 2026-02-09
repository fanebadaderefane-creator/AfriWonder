import React from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2, Edit2, Flag } from 'lucide-react';

export default function CommentActions({ 
  comment, 
  isOwnComment, 
  onDelete, 
  onEdit, 
  onReport 
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isOwnComment ? (
          <>
            <DropdownMenuItem onClick={() => onEdit(comment)} className="cursor-pointer">
              <Edit2 className="w-4 h-4 mr-2" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(comment.id)} 
              className="cursor-pointer text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onClick={() => onReport(comment)} className="cursor-pointer">
            <Flag className="w-4 h-4 mr-2" />
            Signaler
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}