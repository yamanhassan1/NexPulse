import { FiCheck } from 'react-icons/fi'

const features = ['No install required', 'Project-wide context', 'Works on any device']

function FeatureList() {
    return (
        <ul id='docs' className='mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px] text-slate-500'>
            {features.map((feature) => (
                <li key={feature} className='flex items-center gap-2'>
                    <FiCheck className='text-brand-400' /> {feature}
                </li>
            ))}
        </ul>
    )
}

export default FeatureList
