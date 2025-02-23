import WidgetConfigContent from './widget-config'

interface WidgetConfigPageProps {
    params: { projectId: string }
}

export default function WidgetConfigPage({ params }: WidgetConfigPageProps) {
    return <WidgetConfigContent projectId={params.projectId} />;
}