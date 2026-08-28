import '@testing-library/jest-native/extend-expect';

// Mock (Falsificação) do @expo/vector-icons:
// O Jest não consegue carregar fontes nativas do celular (como ícones do Expo) pois roda em Node.js.
// Se não mockarmos, o React fica tentando carregar a fonte eternamente, gerando avisos falsos de erro (act warning).
// Isso substitui os ícones pesados por um simples texto na hora do teste.
jest.mock('@expo/vector-icons', () => {
    const React = require('react');
    const { Text } = require('react-native');
    const MockIcon = (props: any) => React.createElement(Text, props, props.name);

    return {
        Ionicons: MockIcon,
        MaterialIcons: MockIcon,
        FontAwesome: MockIcon,
        Feather: MockIcon,
        AntDesign: MockIcon,
        Entypo: MockIcon,
    };

});
