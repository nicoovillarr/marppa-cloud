import { IconType } from "react-icons";
import {
    LuBox,
    LuBuilding2,
    LuCpu,
    LuLayers,
    LuServer,
    LuUsers,
} from "react-icons/lu";

export const ADMIN_ROOT = "/dashboard/admin";

export const ADMIN_SECTIONS: {
    href: string;
    label: string;
    description: string;
    icon: IconType;
}[] = [
        {
            href: `${ADMIN_ROOT}/hive`,
            label: "Hive catalog",
            description: "Worker images, families, flavors and storage types.",
            icon: LuServer,
        },
        {
            href: `${ADMIN_ROOT}/nucleus`,
            label: "Nucleus catalog",
            description: "Atom images and sizes.",
            icon: LuBox,
        },
        {
            href: `${ADMIN_ROOT}/companies`,
            label: "Companies",
            description: "Tenants and their hierarchy.",
            icon: LuBuilding2,
        },
        {
            href: `${ADMIN_ROOT}/users`,
            label: "Users",
            description: "Accounts, roles and company membership.",
            icon: LuUsers,
        },
        {
            href: `${ADMIN_ROOT}/hosts`,
            label: "Host capacity",
            description: "Capacity the scheduler budgets against.",
            icon: LuCpu,
        },
        {
            href: `${ADMIN_ROOT}/resources`,
            label: "Resources",
            description: "Every resource on the platform, across companies.",
            icon: LuLayers,
        },
    ];
