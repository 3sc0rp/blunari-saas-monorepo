import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoTemplate } from '@/types/agency';
import { Clock, Star, Zap } from 'lucide-react';

interface DemoTemplateCardProps {
  template: DemoTemplate;
  onSelect: (templateId: DemoTemplate['id']) => void;
  isSelected?: boolean;
}

export function DemoTemplateCard({ template, onSelect, isSelected }: DemoTemplateCardProps) {
  return (
    <Card className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
      isSelected ? 'ring-2 ring-primary shadow-lg' : ''
    }`} onClick={() => onSelect(template.id)}>
      <CardHeader className="pb-3">
        <div className="aspect-video w-full rounded-lg overflow-hidden bg-gradient-to-br from-muted/50 to-muted">
          <img 
            src={template.previewImage} 
            alt={template.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex items-start justify-between pt-2">
          <div>
            <h3 className="font-semibold text-lg">{template.name}</h3>
            <p className="text-sm text-muted-foreground">{template.category}</p>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="text-sm font-medium">{template.popularityScore}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{template.description}</p>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{template.estimatedSetupTime}</span>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Zap className="h-3 w-3" />
            Popular
          </Badge>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Key Features:</h4>
          <div className="grid grid-cols-1 gap-1">
            {template.features.slice(0, 3).map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>{feature}</span>
              </div>
            ))}
            {template.features.length > 3 && (
              <div className="text-xs text-muted-foreground pl-3.5">
                +{template.features.length - 3} more features
              </div>
            )}
          </div>
        </div>

        <Button 
          className="w-full" 
          variant={isSelected ? "default" : "outline"}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(template.id);
          }}
        >
          {isSelected ? 'Selected' : 'Select Template'}
        </Button>
      </CardContent>
    </Card>
  );
}