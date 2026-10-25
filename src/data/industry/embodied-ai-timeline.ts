// 具身智能调研：发展路径时间轴节点数据
// 约定：所有事实均经核实，sources 里的编号对应文末「参考链接」的 [Sxx]；
// 找不到可靠来源的事件一律不录入。配图均为官方素材，credit 标注来源。

import type { ImageMetadata } from 'astro';

import figure03Img from '../../assets/industry/embodied-ai/figure-03.jpg';
import atlasElectricImg from '../../assets/industry/embodied-ai/atlas-electric.jpg';
import grootN1Img from '../../assets/industry/embodied-ai/groot-n1.jpg';
import geminiRoboticsImg from '../../assets/industry/embodied-ai/gemini-robotics.jpg';
import unitreeH1Img from '../../assets/industry/embodied-ai/unitree-h1.png';
import agilityDigitImg from '../../assets/industry/embodied-ai/agility-digit.jpg';
import agibotA2Img from '../../assets/industry/embodied-ai/agibot-a2.png';

export interface TimelineNode {
  /** 事件日期（YYYY / YYYY-MM / YYYY-MM-DD），用于排序与展示 */
  date: string;
  /** tech = 左侧技术路线；industry = 右侧行业发展 */
  side: 'tech' | 'industry';
  title: string;
  /** 2-3 句概述，只写可核实事实 */
  summary: string;
  /** 官方素材配图（本地导入，经 Astro 优化） */
  image?: {
    src: ImageMetadata;
    alt: string;
    /** 图片来源署名，如「图片来源：Boston Dynamics 官方博客」 */
    credit: string;
  };
  /** 参考链接 */
  links: { label: string; url: string }[];
  /** 对应文末参考链接编号 */
  sources: string[];
}

export const embodiedAiTimeline: TimelineNode[] = [
  // ===== 左侧：技术路线 =====
  {
    date: '2013-12',
    side: 'tech',
    title: 'DQN：深度强化学习起点',
    summary:
      'DeepMind 发表 DQN（Deep Q-Network），首次用卷积网络直接从像素输入学习控制策略，在 Atari 游戏上达到人类水平。它验证了「神经网络端到端输出动作」这条路线的可行性，是后来机器人学习的技术源头之一。',
    links: [{ label: 'arXiv:1312.5602', url: 'https://arxiv.org/abs/1312.5602' }],
    sources: ['S01'],
  },
  {
    date: '2017-03',
    side: 'tech',
    title: '域随机化：sim-to-real 迁移',
    summary:
      'Tobin 等人提出域随机化（Domain Randomization）：在仿真中随机化渲染外观，模型只看仿真图像即可迁移到真机抓取。这篇论文让「仿真造数据」成为机器人学习的主流数据来源之一。',
    links: [{ label: 'arXiv:1703.06907', url: 'https://arxiv.org/abs/1703.06907' }],
    sources: ['S02'],
  },
  {
    date: '2018-08',
    side: 'tech',
    title: 'OpenAI Dactyl 灵巧手',
    summary:
      'OpenAI 用域随机化 + 强化学习在纯仿真环境中训练 Shadow Hand 做物体重定向，零真机微调直接迁移到实体机器人。它证明了 sim-to-real 可以处理高自由度灵巧操作任务。',
    links: [{ label: 'arXiv:1808.00177', url: 'https://arxiv.org/abs/1808.00177' }],
    sources: ['S03'],
  },
  {
    date: '2022-04',
    side: 'tech',
    title: 'SayCan：LLM 接地到机器人',
    summary:
      'Google 提出 SayCan：用大语言模型提出候选动作，再用预训练技能的价值函数判断「物理上可执行」，二者相乘选出下一步。它是「LLM 做规划、机器人策略做执行」分层的代表工作。',
    links: [{ label: 'arXiv:2204.01691', url: 'https://arxiv.org/abs/2204.01691' }],
    sources: ['S04'],
  },
  {
    date: '2022-12',
    side: 'tech',
    title: 'RT-1：真机数据规模化',
    summary:
      'Google Robotics Transformer-1 用 13 个月、17 台机器人采集的 13 万+ 条真机演示训练端到端多任务策略，覆盖 700+ 任务。它把「大规模真机数据 + Transformer」确立为机器人学习的新范式。',
    links: [{ label: 'arXiv:2212.06817', url: 'https://arxiv.org/abs/2212.06817' }],
    sources: ['S05'],
  },
  {
    date: '2023-03',
    side: 'tech',
    title: 'Diffusion Policy：扩散策略',
    summary:
      '哥大/丰田研究院提出把视觉运动策略建模为条件扩散去噪过程，擅长表达多模态动作分布，在推、抓、倒水等任务上显著超过当时方法。扩散策略成为机器人领域被广泛采用的策略表示之一。',
    links: [{ label: 'arXiv:2303.04137', url: 'https://arxiv.org/abs/2303.04137' }],
    sources: ['S06'],
  },
  {
    date: '2023-07',
    side: 'tech',
    title: 'RT-2：VLA 范式确立',
    summary:
      'Google DeepMind 的 RT-2 把动作离散化为 token，与视觉-语言模型（VLM）联合训练，首次把网络知识与机器人控制接通，并正式命名 Vision-Language-Action（VLA）模型。「VLA」自此成为具身大脑的主流技术路线。',
    links: [{ label: 'arXiv:2307.15818', url: 'https://arxiv.org/abs/2307.15818' }],
    sources: ['S07'],
  },
  {
    date: '2023-10',
    side: 'tech',
    title: 'Open X-Embodiment 数据集',
    summary:
      '21 家机构把 22 种机器人的 100 万+ 轨迹汇成 Open X-Embodiment 数据集，训练出的 RT-X 策略在多个本体上超过各自单机训练的基线。跨本体数据共享首次被大规模验证。',
    links: [{ label: 'arXiv:2310.08864', url: 'https://arxiv.org/abs/2310.08864' }],
    sources: ['S08'],
  },
  {
    date: '2024-06',
    side: 'tech',
    title: 'OpenVLA：开源 VLA',
    summary:
      '斯坦福等机构发布 7B 参数开源 VLA 模型 OpenVLA，在 97 万条真机演示（Open X-Embodiment）上训练，多项评测超过闭源 RT-2-X，并放出了全部权重与训练流程。开源社区自此有了可复现的 VLA 基线。',
    links: [{ label: 'arXiv:2406.09246', url: 'https://arxiv.org/abs/2406.09246' }],
    sources: ['S09'],
  },
  {
    date: '2024-10',
    side: 'tech',
    title: 'π0：流匹配动作专家',
    summary:
      'Physical Intelligence 发布 π0：在开源 VLM 上叠加流匹配（flow matching）动作专家，支持灵巧操作等高频率精细控制，在多平台机器人上通用。流匹配自此与扩散策略并列为主流动作生成方式。',
    links: [{ label: 'arXiv:2410.24164', url: 'https://arxiv.org/abs/2410.24164' }],
    sources: ['S10'],
  },
  {
    date: '2025-03',
    side: 'tech',
    title: 'Gemini Robotics',
    summary:
      'Google DeepMind 发布基于 Gemini 2.0 的 Gemini Robotics（VLA）与 Gemini Robotics-ER（具身推理），把「动作」作为多模态模型的直接输出模态，并公布了与 Apptronik、Agile Robots 的合作。',
    image: {
      src: geminiRoboticsImg,
      alt: 'Gemini Robotics 模型与机器人交互示意',
      credit: '图片来源：Google DeepMind 官方博客',
    },
    links: [
      {
        label: 'DeepMind 官方博客',
        url: 'https://deepmind.google/blog/gemini-robotics-brings-ai-into-the-physical-world/',
      },
    ],
    sources: ['S13'],
  },
  {
    date: '2025-03',
    side: 'tech',
    title: 'NVIDIA GR00T N1 开源',
    summary:
      'NVIDIA 在 GTC 2025 发布并开源人形机器人基础模型 Isaac GR00T N1：双系统架构（快思考 VLM + 慢思考扩散策略），配套开源仿真库与数据管线，供 Figure、1X、宇树等厂商使用。',
    image: {
      src: grootN1Img,
      alt: 'NVIDIA Isaac GR00T N1 人形机器人基础模型',
      credit: '图片来源：NVIDIA 新闻中心',
    },
    links: [
      {
        label: 'NVIDIA 新闻稿',
        url: 'https://nvidianews.nvidia.com/news/nvidia-releases-isaac-gr00t-n1-worlds-first-open-humanoid-robot-foundation-model-and-simulation-libraries',
      },
    ],
    sources: ['S14'],
  },
  {
    date: '2025-04',
    side: 'tech',
    title: 'π0.5：开放世界泛化',
    summary:
      'Physical Intelligence 发布 π0.5：用多机器人真机数据 + 互联网图文数据协同训练，演示了跨本体迁移与未经专门训练的开放世界任务（如整理桌面、做早餐）。它把「网络知识如何进入机器人策略」推进了一步。',
    links: [{ label: 'arXiv:2504.16054', url: 'https://arxiv.org/abs/2504.16054' }],
    sources: ['S11'],
  },
  {
    date: '2025-08',
    side: 'tech',
    title: 'Genie 3：交互式世界模型',
    summary:
      'Google DeepMind 发布 Genie 3 世界模型：从文本生成可实时交互的 3D 世界，明确目标是作为智能体训练环境。世界模型被普遍视为缓解真机数据瓶颈的候选路线。',
    links: [
      {
        label: 'DeepMind 官方博客',
        url: 'https://deepmind.google/blog/genie-3-a-new-frontier-for-world-models/',
      },
    ],
    sources: ['S15'],
  },
  {
    date: '2025-11',
    side: 'tech',
    title: 'π*0.6：真机强化学习回归',
    summary:
      'Physical Intelligence 发布 π*0.6，提出 RECAP 方法：先大规模预训练，再用真机强化学习在后训练阶段持续改进。官方称困难任务上的单位时间吞吐量较 π0 提升约一倍。「预训练 + 真机 RL 后训练」成为新范式候选。',
    links: [{ label: 'Physical Intelligence 博客', url: 'https://www.pi.website/blog/pistar06' }],
    sources: ['S12'],
  },

  // ===== 右侧：行业发展 =====
  {
    date: '2015-06',
    side: 'industry',
    title: 'DARPA 机器人挑战赛决赛',
    summary:
      'DRC 决赛在美国加州举行，23 支队伍在模拟灾害场景中完成驾驶、开门、爬梯等任务，奖金 200 万美元。这场赛事锻炼出的一批团队后来成为全球机器人产业与学术界的骨干。',
    links: [{ label: 'NIST 官方回顾', url: 'https://www.nist.gov/el/el-highlights-september-2015' }],
    sources: ['S16'],
  },
  {
    date: '2022-09',
    side: 'industry',
    title: 'Tesla Optimus 原型首秀',
    summary:
      'Tesla 在 AI Day 上首次展示 Optimus 人形机器人原型机，无系绳自主走上舞台并挥手。Musk 表示计划量产数百万台。注：Tesla 未发布官方新闻稿，本条依据现场视频与媒体报道。',
    links: [
      {
        label: 'CGTN 报道',
        url: 'https://news.cgtn.com/news/2022-10-01/Tesla-robot-walks-waves-Musk-plans-to-make-millions-of-them-1dMwa0LIH5e/index.html',
      },
    ],
    sources: ['S17'],
  },
  {
    date: '2023-03',
    side: 'industry',
    title: 'Figure 01 发布',
    summary:
      '美国公司 Figure 走出隐身状态，发布首款人形机器人 Figure 01，定位全球供应链劳动力缺口，宣称目标量产「如造车一般」制造机器人。此后 Figure 成为估值最高的人形机器人创业公司之一。',
    links: [
      {
        label: 'Figure 官方新闻稿',
        url: 'https://www.prnewswire.com/news-releases/figure-emerges-from-stealth-and-unveils-figure-01--a-humanoid-robot-to-support-supply-chain-on-a-global-scale-301759983.html',
      },
    ],
    sources: ['S18'],
  },
  {
    date: '2023-08',
    side: 'industry',
    title: '宇树 H1 发布',
    summary:
      '杭州宇树科技发布首款通用人形机器人 H1（后迭代为 H1-2），以高动态运动能力和显著低于同行的售价引发关注。宇树自此从四足机器人厂商扩展为通用人形机器人厂商。',
    image: {
      src: unitreeH1Img,
      alt: '宇树 H1 人形机器人',
      credit: '图片来源：宇树科技官网',
    },
    links: [{ label: '宇树官网', url: 'https://www.unitree.com/en/about/' }],
    sources: ['S19'],
  },
  {
    date: '2023-10',
    side: 'industry',
    title: 'Agility Digit 进入 Amazon 仓储',
    summary:
      'Agility Robotics 宣布与 Amazon 扩大合作，在仓储研发站点测试人形机器人 Digit，承担空周转箱回收任务。人形机器人进入真实物流作业场景有了首个公开的企业级试点。',
    image: {
      src: agilityDigitImg,
      alt: 'Agility Digit 人形机器人在仓储场景作业',
      credit: '图片来源：Agility Robotics 官方新闻页',
    },
    links: [
      {
        label: 'Agility 官方新闻',
        url: 'https://www.agilityrobotics.com/content/agility-robotics-broadens-relationship-with-amazon',
      },
    ],
    sources: ['S20'],
  },
  {
    date: '2023-11',
    side: 'industry',
    title: '工信部《人形机器人创新发展指导意见》',
    summary:
      '中国工信部印发指导意见，提出到 2025 年人形机器人整机批量生产、创新体系初步建立，2027 年综合实力达到世界先进水平。这是中国首个国家层面的人形机器人专项政策，直接带动了后续产业与资本热潮。',
    links: [
      {
        label: '中国政府网',
        url: 'https://www.gov.cn/lianbo/bumen/202311/content_6913551.htm',
      },
    ],
    sources: ['S31'],
  },
  {
    date: '2024-02',
    side: 'industry',
    title: '优必选 Walker S 进车厂实训',
    summary:
      '优必选 Walker S 进入蔚来总装车间开展实训，执行质检、贴标等任务，是首批进入汽车工厂的人形机器人之一（官方方案页未标注起始日期，2 月时间点来自媒体报道）。工业制造自此成为人形机器人最重要的落地叙事。',
    links: [{ label: '优必选官网方案页', url: 'https://www.ubtrobot.com/cn/humanoid/solutions' }],
    sources: ['S21'],
  },
  {
    date: '2024-04',
    side: 'industry',
    title: 'Boston Dynamics 电动 Atlas',
    summary:
      'Boston Dynamics 宣布液压驱动的人形 Atlas 退役，发布全新电动版 Atlas，面向工业应用并与现代汽车集团深度绑定。老牌厂商完成从「研究平台」向「商用产品」的转向（官方页面未标注具体日期）。',
    image: {
      src: atlasElectricImg,
      alt: 'Boston Dynamics 电动版 Atlas',
      credit: '图片来源：Boston Dynamics 官方博客',
    },
    links: [
      {
        label: 'Boston Dynamics 博客',
        url: 'https://bostondynamics.com/blog/electric-new-era-for-atlas/',
      },
    ],
    sources: ['S22'],
  },
  {
    date: '2024-08',
    side: 'industry',
    title: '智元远征 A2 与量产启动',
    summary:
      '智元机器人（AgiBot）发布远征 A2 等五款商用人形机器人，宣布当年 12 月至次年 1 月开启批量制造。智元以「本体 + 数据 + 模型」全栈布局，成为国内具身智能头部创业公司之一。',
    image: {
      src: agibotA2Img,
      alt: '智元远征 A2 人形机器人',
      credit: '图片来源：智元机器人官网',
    },
    links: [{ label: '智元官网', url: 'https://www.agibot.com.cn/article/188/detail/107.html' }],
    sources: ['S23'],
  },
  {
    date: '2024-12',
    side: 'industry',
    title: 'AgiBot World 开源数据集',
    summary:
      '智元开源 AgiBot World 真机数据集，官方称为「全球首个百万真机数据集」，由自有本体遥操作采集，覆盖多种长程任务。国内厂商开始把数据资产作为生态入口对外开放。',
    links: [{ label: '智元官网', url: 'https://www.agibot.com.cn/about_Zhiyuan' }],
    sources: ['S28'],
  },
  {
    date: '2025-09',
    side: 'industry',
    title: 'Figure C 轮融资超 10 亿美元',
    summary:
      'Figure 宣布 C 轮融资，承诺资本超 10 亿美元，投后估值 390 亿美元，成为全球估值最高的人形机器人公司。人形机器人赛道的资本聚集度达到新高度。',
    links: [{ label: 'Figure 官方', url: 'https://www.figure.ai/news/series-c' }],
    sources: ['S24'],
  },
  {
    date: '2025-09',
    side: 'industry',
    title: 'Scale AI 发力 Physical AI 数据',
    summary:
      'Scale AI 官宣扩展 Physical AI 数据引擎，为 Physical Intelligence 等客户提供机器人数据服务，称已交付 10 万+ 小时生产数据。「数据即服务」成为具身智能产业链中独立成形的商业化环节。',
    links: [{ label: 'Scale 官方博客', url: 'https://scale.com/blog/physical-ai' }],
    sources: ['S29'],
  },
  {
    date: '2025-10',
    side: 'industry',
    title: 'Figure 03 与量产设计',
    summary:
      'Figure 发布第三代机器人 Figure 03，围绕自研 Helix VLA 模型与规模化量产重新设计硬件。同期 1X 开放家用人形机器人 NEO 预订（2026 年起在美国交付），人形机器人从工业场景向家庭场景延伸。',
    image: {
      src: figure03Img,
      alt: 'Figure 03 人形机器人',
      credit: '图片来源：Figure 官方新闻页',
    },
    links: [
      { label: 'Figure 03 发布', url: 'https://www.figure.ai/news/introducing-figure-03' },
      { label: '1X NEO 预订', url: 'https://www.1x.tech/discover/neo-home-robot' },
    ],
    sources: ['S25', 'S26'],
  },
  {
    date: '2026-03',
    side: 'industry',
    title: '光轮智能成为具身数据独角兽',
    summary:
      '专注合成数据的北京公司光轮智能完成合计 10 亿元融资，成为具身智能数据领域首个独角兽（北京市科委转载报道），官方口径称其合作方包括 Figure AI 与 NVIDIA。具身数据服务独立赛道获资本市场确认。',
    links: [
      {
        label: '北京市科委网站',
        url: 'https://kw.beijing.gov.cn/xwdt/kcyx/xwdtyqqy/202603/t20260312_4551125.html',
      },
    ],
    sources: ['S30'],
  },
  {
    date: '2026-08',
    side: 'industry',
    title: '宇树科技科创板上市',
    summary:
      '宇树科技（688836）在上交所科创板挂牌上市，成为国内「人形机器人第一股」。机器人本体厂商开始进入公开资本市场，行业进入新的发展阶段。',
    links: [
      {
        label: '上交所公告',
        url: 'https://www.sse.com.cn/disclosure/announcement/listing/ipo/c/c_20260818_10829204.shtml',
      },
    ],
    sources: ['S27'],
  },
];
