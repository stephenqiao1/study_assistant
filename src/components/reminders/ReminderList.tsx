import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Reminder = {
  id: string;
  title: string;
  due_date: string;
  type: 'assignment' | 'exam';
  user_id: string;
  study_session_id: string;
  created_at: string;
  updated_at: string;
};

interface ReminderListProps {
  moduleId: string;  // This is actually the study_session_id
}

export default function ReminderList({ moduleId }: ReminderListProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [type, setType] = useState<'assignment' | 'exam'>('assignment');
  const [isLoading, setIsLoading] = useState(false);

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

  const addReminder = async () => {
    if (!title || !dueDate) return;

    setIsLoading(true);
    try {
      const requestBody = {
        title,
        due_date: dueDate.toISOString(),
        type,
        study_session_id: moduleId
      };
      
      console.log('Sending reminder request with body:', requestBody);
      
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server response:', errorData);
        throw new Error(errorData.error || 'Failed to add reminder');
      }

      const data = await response.json();
      console.log('Success response:', data);

      setTitle('');
      setDueDate(undefined);
      await fetchReminders();
    } catch (error) {
      console.error('Error adding reminder:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      const response = await fetch(`/api/reminders?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete reminder');

      await fetchReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Input
          placeholder="Enter reminder title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full sm:w-[240px] justify-start text-left font-normal',
                !dueDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? format(dueDate, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={setDueDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <div className="flex gap-2">
          <Button
            variant={type === 'assignment' ? 'default' : 'outline'}
            onClick={() => setType('assignment')}
            className="flex-1 sm:flex-none"
          >
            Assignment
          </Button>
          <Button
            variant={type === 'exam' ? 'default' : 'outline'}
            onClick={() => setType('exam')}
            className="flex-1 sm:flex-none"
          >
            Exam
          </Button>
        </div>
        <Button 
          onClick={addReminder} 
          disabled={!title || !dueDate || isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? 'Adding...' : 'Add Reminder'}
        </Button>
      </div>

      <div className="space-y-2">
        {reminders.map((reminder) => {
          const dueDate = new Date(reminder.due_date);
          const isOverdue = dueDate < new Date();

          return (
            <div
              key={reminder.id}
              className={cn(
                'flex items-center justify-between p-4 rounded-lg border',
                isOverdue ? 'border-destructive/50 bg-destructive/5' : 'border-border'
              )}
            >
              <div className="space-y-1">
                <div className="font-medium">{reminder.title}</div>
                <div className="text-sm text-muted-foreground">
                  Due: {format(dueDate, 'PPP')}
                  {isOverdue && (
                    <span className="ml-2 text-destructive">(Overdue)</span>
                  )}
                </div>
                <div className="text-sm">
                  Type: {reminder.type.charAt(0).toUpperCase() + reminder.type.slice(1)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteReminder(reminder.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
} 