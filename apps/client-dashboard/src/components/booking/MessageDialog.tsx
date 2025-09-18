import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultChannel?: 'sms' | 'email';
  onSend: (payload: { channel: 'sms'|'email'; to: string; subject?: string; body: string }) => Promise<void> | void;
}

const TEMPLATES: Record<string, string> = {
  confirm: 'Hi {{name}}, your reservation for {{date}} at {{time}} is confirmed. Reply STOP to opt out.',
  reminder: 'Reminder: {{date}} at {{time}} for {{name}}. See you soon!',
  table_ready: 'Your table is ready. Please see the host when you arrive.'
};

const MessageDialog: React.FC<Props> = ({ open, onOpenChange, defaultChannel = 'sms', onSend }) => {
  const [channel, setChannel] = useState<'sms'|'email'>(defaultChannel);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(TEMPLATES.confirm);
  const [loading, setLoading] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Channel</Label>
              <div className="flex gap-2 mt-1">
                <Button size="sm" variant={channel==='sms'?'default':'outline'} onClick={()=>setChannel('sms')}>SMS</Button>
                <Button size="sm" variant={channel==='email'?'default':'outline'} onClick={()=>setChannel('email')}>Email</Button>
              </div>
            </div>
            <div>
              <Label>Template</Label>
              <div className="flex gap-2 mt-1">
                {Object.keys(TEMPLATES).map(k => (
                  <Button key={k} size="sm" variant="outline" onClick={()=>setBody(TEMPLATES[k])}>{k}</Button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <Label>To</Label>
            <Input value={to} onChange={(e)=>setTo(e.target.value)} placeholder={channel==='sms'?'+1 555-555-5555':'guest@example.com'} />
          </div>
          {channel==='email' && (
            <div>
              <Label>Subject</Label>
              <Input value={subject} onChange={(e)=>setSubject(e.target.value)} />
            </div>
          )}
          <div>
            <Label>Message</Label>
            <Textarea rows={5} value={body} onChange={(e)=>setBody(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button>
            <Button onClick={async()=>{ setLoading(true); try { await onSend({ channel, to, subject, body }); onOpenChange(false); } finally { setLoading(false); } }} disabled={loading}>Send</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageDialog;

