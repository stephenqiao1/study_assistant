'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface ReminderType {
  id: string;
  title: string;
  due_date: string;
  type: 'assignment' | 'exam';
  study_session_id: string;
}

interface FloatingReminderIndicatorProps {
  moduleId: string;  // This is actually the study_session_id
  onExpand: (expanded: boolean) => void;
}

export default function FloatingReminderIndicator({ moduleId, onExpand }: FloatingReminderIndicatorProps) {
  const [reminders, setReminders] = useState<ReminderType[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchReminders = useCallback(async () => {
    try {
      const response = await fetch(`/api/reminders?study_session_id=${moduleId}`);
      const { data } = await response.json();
      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  }, [moduleId]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    onExpand(!isExpanded);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        className="h-12 w-12 rounded-full bg-background shadow-lg hover:bg-accent"
        onClick={toggleExpand}
      >
        <Bell className="h-6 w-6" />
        {reminders.length > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center">
            {reminders.length}
          </span>
        )}
      </Button>

      {isExpanded && (
        <div className="absolute bottom-16 right-0 w-80 rounded-lg border bg-background p-4 shadow-lg z-50">
          <h3 className="font-semibold mb-2">Upcoming Reminders</h3>
          <div className="space-y-2">
            {reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reminders for this module</p>
            ) : (
              reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between p-2 rounded-md bg-muted">
                  <div>
                    <p className="font-medium">{reminder.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(reminder.due_date), 'PPP')}
                    </p>
                  </div>
                  <span className="text-xs font-medium uppercase bg-primary/10 text-primary px-2 py-1 rounded">
                    {reminder.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
} 