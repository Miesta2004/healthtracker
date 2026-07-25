// frontend/src/components/calendrier/RappelsPanel.tsx

import {
    Bell,
    Clock3,
    CalendarClock,
    AlertTriangle,
    CheckCircle2,
} from "lucide-react";

interface Rappel {
    id: string;
    titre: string;
    heure: string;
    type: "consultation" | "intervention" | "urgence" | "rappel";
}

const RAPPELS: Rappel[] = [
    {
        id: "1",
        titre: "Consultation - M. Ndiaye",
        heure: "08:30",
        type: "consultation",
    },
    {
        id: "2",
        titre: "Bloc opératoire - Salle 2",
        heure: "10:00",
        type: "intervention",
    },
    {
        id: "3",
        titre: "Patient critique - Chambre 214",
        heure: "13:45",
        type: "urgence",
    },
    {
        id: "4",
        titre: "Réunion de service",
        heure: "16:00",
        type: "rappel",
    },
];

const COLORS = {
    consultation: {
        bg: "#2563EB15",
        color: "#2563EB",
        Icon: CalendarClock,
    },
    intervention: {
        bg: "#8B5CF615",
        color: "#8B5CF6",
        Icon: Clock3,
    },
    urgence: {
        bg: "#EF444415",
        color: "#EF4444",
        Icon: AlertTriangle,
    },
    rappel: {
        bg: "#10B98115",
        color: "#10B981",
        Icon: CheckCircle2,
    },
};

export default function RappelsPanel() {
    return (
        <div
            className="rounded-3xl border p-6"
            style={{
                background: "var(--ht-card)",
                borderColor: "var(--ht-border-input)",
            }}
        >
            <div className="flex items-center gap-3 mb-6">
                <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{
                        background: "var(--ht-primary-light)",
                        color: "var(--ht-primary)",
                    }}
                >
                    <Bell size={22} />
                </div>

                <div>
                    <h3
                        className="font-semibold text-lg"
                        style={{
                            color: "var(--ht-text)",
                        }}
                    >
                        Rappels
                    </h3>

                    <p
                        className="text-sm"
                        style={{
                            color: "var(--ht-text-muted)",
                        }}
                    >
                        Événements importants de la journée
                    </p>
                </div>
            </div>

            <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-4">
                {RAPPELS.map((item) => {
                    const config = COLORS[item.type];

                    return (
                        <div
                            key={item.id}
                            className="rounded-2xl border p-4 transition-all hover:-translate-y-1"
                            style={{
                                borderColor:
                                    "var(--ht-border-input)",
                            }}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                                    style={{
                                        background: config.bg,
                                        color: config.color,
                                    }}
                                >
                                    <config.Icon size={18} />
                                </div>

                                <div className="flex-1">
                                    <p
                                        className="font-semibold"
                                        style={{
                                            color:
                                                "var(--ht-text)",
                                        }}
                                    >
                                        {item.titre}
                                    </p>

                                    <p
                                        className="text-sm mt-1"
                                        style={{
                                            color:
                                                "var(--ht-text-muted)",
                                        }}
                                    >
                                        {item.heure}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}