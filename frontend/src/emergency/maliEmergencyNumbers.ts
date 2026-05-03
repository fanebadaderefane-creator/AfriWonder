import type { ComponentProps } from 'react';
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type MaliEmergencyContact = {
  id: string;
  categoryLabel: string;
  name: string;
  number: string;
  accentColor: string;
  accentColorEnd: string;
  icon: MciName;
};

/** Numéros verts / urgence — référence publique (Ministère Sécurité & Protection civile). */
export const MALI_EMERGENCY_CONTACTS: MaliEmergencyContact[] = [
  {
    id: 'police',
    categoryLabel: 'POLICE',
    name: 'Police Nationale',
    number: '101',
    accentColor: '#42A5F5',
    accentColorEnd: '#1E88E5',
    icon: 'shield-star',
  },
  {
    id: 'gendarmerie',
    categoryLabel: 'GENDARMERIE',
    name: 'Gendarmerie Nationale',
    number: '111',
    accentColor: '#7E57C2',
    accentColorEnd: '#5E35B1',
    icon: 'shield-half-full',
  },
  {
    id: 'pompiers',
    categoryLabel: 'POMPIERS',
    name: 'Protection civile',
    number: '122',
    accentColor: '#E53935',
    accentColorEnd: '#C62828',
    icon: 'fire-truck',
  },
  {
    id: 'seplapc',
    categoryLabel: 'SEPLAPC',
    name: 'Lutte contre la prolifération des armes',
    number: '133',
    accentColor: '#8E24AA',
    accentColorEnd: '#6A1B9A',
    icon: 'pistol',
  },
  {
    id: 'ocs',
    categoryLabel: 'OCS',
    name: 'Office central des stupéfiants',
    number: '135',
    accentColor: '#FB8C00',
    accentColorEnd: '#E65100',
    icon: 'needle',
  },
  {
    id: 'ccgc',
    categoryLabel: 'CCGC',
    name: 'Centre de coordination et de gestion des crises',
    number: '144',
    accentColor: '#FFB300',
    accentColorEnd: '#FF8F00',
    icon: 'alert-decagram',
  },
  {
    id: 'garde',
    categoryLabel: 'GARDE NAT.',
    name: 'Garde nationale',
    number: '145',
    accentColor: '#00897B',
    accentColorEnd: '#00695C',
    icon: 'shield-account',
  },
];

export function getMaliEmergencyContactNumbers(): string[] {
  return MALI_EMERGENCY_CONTACTS.map((c) => c.number);
}
