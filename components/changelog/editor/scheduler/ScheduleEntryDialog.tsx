"use client";

import React, {useState} from 'react';
import {z} from 'zod';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {format, addDays, addHours, isAfter} from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Switch} from '@/components/ui/switch';
import {
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle,
    Mail,
} from 'lucide-react';
import {useToast} from '@/hooks/use-toast';

const scheduleSchema = z.object({
    scheduledAt: z.date().refine(
        (date) => isAfter(date, new Date()),
        "Schedule time must be in the future"
    ),
    sendEmailNotification: z.boolean().default(false),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface ScheduleEntryDialogProps {
    entryId: string;
    projectId: string;
    entryTitle: string;
    isScheduled: boolean;
    scheduledAt?: string | null;
    isPublished: boolean;
    projectRequiresApproval: boolean;
    projectHasEmailConfig: boolean;
    userRole: 'ADMIN' | 'STAFF' | 'VIEWER';
    onScheduleChange?: () => void;
}

export const ScheduleEntryDialog: React.FC<ScheduleEntryDialogProps> = ({
                                                                            entryId,
                                                                            projectId,
                                                                            entryTitle,
                                                                            isScheduled,
                                                                            scheduledAt,
                                                                            isPublished,
                                                                            projectRequiresApproval,
                                                                            projectHasEmailConfig,
                                                                            userRole,
                                                                            onScheduleChange,
                                                                        }) => {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const {toast} = useToast();

    const form = useForm<ScheduleFormData>({
        resolver: zodResolver(scheduleSchema),
        defaultValues: {
            scheduledAt: scheduledAt ? new Date(scheduledAt) : addHours(new Date(), 1),
            sendEmailNotification: false,
        },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const canSchedule = userRole === 'ADMIN' ||
        (userRole === 'STAFF' && !projectRequiresApproval);
    const needsApproval = userRole === 'STAFF' && projectRequiresApproval;

    const handleSchedule = async (data: ScheduleFormData) => {
        if (isPublished) {
            toast({
                title: "Cannot schedule",
                description: "This entry is already published.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            if (needsApproval) {
                const response = await fetch(
                    `/api/projects/${projectId}/changelog/${entryId}/schedule/approval`,
                    {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            action: 'request_approval',
                            scheduledAt: data.scheduledAt.toISOString(),
                        }),
                    }
                );

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to request approval');
                }

                toast({
                    title: "Approval requested",
                    description: "Your schedule request has been sent to administrators.",
                });
            } else {
                const response = await fetch(
                    `/api/projects/${projectId}/changelog/${entryId}/schedule`,
                    {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            action: 'schedule',
                            scheduledAt: data.scheduledAt.toISOString(),
                        }),
                    }
                );

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to schedule entry');
                }

                if (data.sendEmailNotification && projectHasEmailConfig) {
                    try {
                        await fetch(
                            `/api/projects/${projectId}/integrations/email/send`,
                            {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({
                                    subject: `Scheduled: ${entryTitle}`,
                                    changelogEntryId: entryId,
                                    subscriptionTypes: ['ALL_UPDATES'],
                                }),
                            }
                        );
                    } catch (emailError) {
                        console.error('Failed to send notification email:', emailError);
                    }
                }

                toast({
                    title: isScheduled ? "Schedule updated" : "Entry scheduled",
                    description: isScheduled
                        ? `Entry rescheduled for ${format(data.scheduledAt, 'PPP p')}.`
                        : `Entry will be published on ${format(data.scheduledAt, 'PPP p')}.`,
                });
            }

            setOpen(false);
            onScheduleChange?.();
        } catch (error) {
            console.error('Scheduling error:', error);
            toast({
                title: "Scheduling failed",
                description: error instanceof Error ? error.message : "Something went wrong",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnschedule = async () => {
        setIsLoading(true);

        try {
            const response = await fetch(
                `/api/projects/${projectId}/changelog/${entryId}/schedule`,
                {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({action: 'unschedule'}),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to unschedule entry');
            }

            toast({
                title: "Entry unscheduled",
                description: "The scheduled publication has been cancelled.",
            });

            setOpen(false);
            onScheduleChange?.();
        } catch (error) {
            console.error('Unscheduling error:', error);
            toast({
                title: "Unscheduling failed",
                description: error instanceof Error ? error.message : "Something went wrong",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getQuickOptions = () => [
        {
            label: 'In 1 hour',
            date: addHours(new Date(), 1),
        },
        {
            label: 'Tomorrow 9 AM',
            date: (() => {
                const tomorrow = addDays(new Date(), 1);
                tomorrow.setHours(9, 0, 0, 0);
                return tomorrow;
            })(),
        },
        {
            label: 'Next Monday 9 AM',
            date: (() => {
                const nextMonday = new Date();
                const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7;
                nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
                nextMonday.setHours(9, 0, 0, 0);
                return nextMonday;
            })(),
        },
    ];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant={isScheduled ? "secondary" : "outline"}
                    size="sm"
                    disabled={isPublished}
                >
                    <Calendar className="h-4 w-4 mr-2"/>
                    {isScheduled ? 'Edit Schedule' : 'Schedule'}
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary"/>
                        Schedule Publication
                    </DialogTitle>
                    <DialogDescription>
                        {needsApproval
                            ? "Request approval to schedule this changelog entry."
                            : "Schedule this changelog entry for automatic publication."
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Entry Info */}
                    <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{entryTitle}</span>
                            {isScheduled && scheduledAt && (
                                <Badge variant="secondary">
                                    {format(new Date(scheduledAt), 'MMM d, h:mm a')}
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Approval Warning */}
                    {needsApproval && (
                        <Alert variant="warning">
                            <AlertDescription className="text-amber-800">
                                This project requires administrator approval for scheduling.
                            </AlertDescription>
                        </Alert>
                    )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSchedule)} className="space-y-4">
                            {/* Quick Options - show for both new and existing schedules */}
                            <div className="space-y-2">
                <span className="text-sm font-medium">
                  {isScheduled ? "Reschedule Options" : "Quick Schedule"}
                </span>
                                <div className="flex gap-2 flex-wrap">
                                    {getQuickOptions().map((option, index) => (
                                        <Button
                                            key={index}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => form.setValue('scheduledAt', option.date)}
                                        >
                                            {option.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Date/Time Input */}
                            <FormField
                                control={form.control}
                                name="scheduledAt"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <Clock className="h-4 w-4"/>
                                            Schedule Date & Time
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="datetime-local"
                                                value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ''}
                                                onChange={(e) => {
                                                    const date = new Date(e.target.value);
                                                    if (!isNaN(date.getTime())) {
                                                        field.onChange(date);
                                                    }
                                                }}
                                                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Entry will be automatically published at this time
                                        </FormDescription>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            {/* Email Notification */}
                            {projectHasEmailConfig && (
                                <FormField
                                    control={form.control}
                                    name="sendEmailNotification"
                                    render={({field}) => (
                                        <FormItem
                                            className="flex flex-row items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <FormLabel className="flex items-center gap-2 text-base">
                                                    <Mail className="h-4 w-4"/>
                                                    Email Notification
                                                </FormLabel>
                                                <FormDescription>
                                                    Send email to subscribers when scheduled
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                {isScheduled ? (
                                    <>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={handleUnschedule}
                                            disabled={isLoading}
                                        >
                                            <AlertCircle className="h-4 w-4 mr-2"/>
                                            Unschedule
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2"/>
                                            Update Schedule
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setOpen(false)}
                                            disabled={isLoading}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                        >
                                            <Calendar className="h-4 w-4 mr-2"/>
                                            {needsApproval ? 'Request Schedule' : 'Schedule Entry'}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
};